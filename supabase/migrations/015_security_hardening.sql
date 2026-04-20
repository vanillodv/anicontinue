-- 015_security_hardening.sql
-- Закрывает критичные дыры безопасности:
--   #1 Privilege escalation через profiles.role/chapters_limit/plan
--   #2 TOCTOU при списании chapters_used
--   #3 Неатомарный webhook + идемпотентность
--   #4 banned в CHECK-constraint (иначе бан падает)
--   #5 Rate limit таблица для /api/generate

-- ============================================================
-- 1. Добавляем 'banned' в CHECK-constraint роли
-- ============================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'moderator', 'admin', 'super_admin', 'banned'));

-- ============================================================
-- 2. Privilege escalation fix
-- Удаляем небезопасную UPDATE-политику и вводим триггер,
-- блокирующий смену role/plan/chapters_limit/subscription_expires_at
-- всеми, кроме service_role.
-- ============================================================
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Определяем роль вызывающего. service_role обходит проверку.
  v_role := current_setting('request.jwt.claim.role', true);
  if v_role is null then
    v_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  end if;

  if v_role = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.chapters_limit is distinct from old.chapters_limit
     or new.plan is distinct from old.plan
     or new.subscription_expires_at is distinct from old.subscription_expires_at then
    raise exception 'Forbidden field update' using errcode = '42501';
  end if;

  -- chapters_used нельзя уменьшать напрямую (обход лимита)
  if new.chapters_used is distinct from old.chapters_used
     and new.chapters_used < old.chapters_used then
    raise exception 'Forbidden: chapters_used cannot decrease' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_escalation on public.profiles;
create trigger profiles_prevent_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- ============================================================
-- 3. Атомарное списание главы (фикс TOCTOU)
-- ============================================================
create or replace function public.consume_chapter(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
  v_limit int;
  v_role text;
begin
  select chapters_used, chapters_limit, role
    into v_used, v_limit, v_role
  from public.profiles
  where id = p_user_id
  for update;

  if not found then return false; end if;
  if v_role = 'banned' then return false; end if;
  if v_used >= v_limit then return false; end if;

  update public.profiles
     set chapters_used = chapters_used + 1
   where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.consume_chapter(uuid) from public;
grant execute on function public.consume_chapter(uuid) to authenticated, service_role;

-- Возврат кредита, если генерация упала после списания
create or replace function public.refund_chapter(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set chapters_used = greatest(0, chapters_used - 1)
   where id = p_user_id;
end;
$$;

revoke all on function public.refund_chapter(uuid) from public;
grant execute on function public.refund_chapter(uuid) to service_role;

-- ============================================================
-- 4. Идемпотентное применение платежа (atomic upsert + profile update)
-- ============================================================
create or replace function public.apply_payment(
  p_payment_id text,
  p_user_id uuid,
  p_purchase_type text,
  p_purchase_id text,
  p_amount integer,
  p_update jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already boolean;
begin
  -- Пытаемся пометить платёж как succeeded. Если строки нет — вставляем.
  -- Если уже succeeded — выходим с false (не применяем повторно).
  update public.payment_logs
     set status = 'succeeded',
         processed_at = now()
   where payment_id = p_payment_id
     and status <> 'succeeded'
  returning true into v_already;

  if v_already is null then
    -- Строки не существовало либо уже была succeeded. Проверим:
    if exists (select 1 from public.payment_logs
                where payment_id = p_payment_id and status = 'succeeded') then
      return false; -- уже применён
    end if;

    -- Строки нет — вставляем succeeded сразу (fallback, если /payment/create не отлогировал)
    insert into public.payment_logs (user_id, payment_id, purchase_type, purchase_id, amount, status, processed_at)
    values (p_user_id, p_payment_id, p_purchase_type, p_purchase_id, p_amount, 'succeeded', now())
    on conflict (payment_id) do nothing;
  end if;

  -- Применяем изменения профиля
  update public.profiles
     set plan = coalesce((p_update->>'plan'), plan),
         chapters_limit = coalesce((p_update->>'chapters_limit')::int, chapters_limit),
         chapters_used = coalesce((p_update->>'chapters_used')::int, chapters_used),
         subscription_expires_at = coalesce((p_update->>'subscription_expires_at')::timestamptz, subscription_expires_at)
   where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.apply_payment(text, uuid, text, text, integer, jsonb) from public;
grant execute on function public.apply_payment(text, uuid, text, text, integer, jsonb) to service_role;

-- ============================================================
-- 5. Rate limiting таблица
-- ============================================================
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

create index if not exists idx_rate_limits_window on public.rate_limits(window_start);

alter table public.rate_limits enable row level security;

-- Только service_role может писать/читать rate_limits
create policy "Service role manages rate limits"
  on public.rate_limits for all
  using (false)
  with check (false);

-- Функция: инкрементирует счётчик в окне и возвращает текущий count
create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_window_start timestamptz;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
                  when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                  then 1
                  else public.rate_limits.count + 1
                end,
        window_start = case
                        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                        then now()
                        else public.rate_limits.window_start
                      end
  returning count, window_start into v_count, v_window_start;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
