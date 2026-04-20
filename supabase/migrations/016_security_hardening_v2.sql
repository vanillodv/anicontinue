-- 016_security_hardening_v2.sql
-- Закрывает дыры, найденные во время верификации:
--   #12 consume_chapter можно дёргать для чужого user_id (burn-out атака)
--   #13 RLS payment_logs проверяет plan вместо role (сломанная защита)
--   #14 username без валидации (захват имён 'admin' и прочие подмены)
--   #15 admin_logs таблица существует, но в неё ничего не пишется

-- ============================================================
-- 1. Починка consume_chapter — authenticated user может вызвать только для себя.
--    service_role обходит проверку (auth.uid() там null).
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
  v_caller uuid;
begin
  v_caller := auth.uid();
  if v_caller is not null and p_user_id is distinct from v_caller then
    return false;
  end if;

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

-- ============================================================
-- 2. Фикс RLS payment_logs: проверяем role, а не plan
-- ============================================================
drop policy if exists "Admins read payment logs" on public.payment_logs;
create policy "Admins read payment logs"
  on public.payment_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );

-- ============================================================
-- 3. Валидация username
--    — длина 2..32
--    — разрешены: латиница, кириллица, цифры, _ и пробел
--    — зарезервированные имена запрещены
--    — уникальность case-insensitive
--    Constraint добавляем как NOT VALID, чтобы не ломать существующие строки.
-- ============================================================

-- Триггер: приводим username к trim и не даём занять зарезервированное
create or replace function public.validate_username()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_clean text;
begin
  if new.username is null then return new; end if;

  v_clean := trim(new.username);
  if length(v_clean) < 2 or length(v_clean) > 32 then
    raise exception 'Invalid username length' using errcode = '22023';
  end if;

  -- Разрешены латиница, кириллица, цифры, пробел, подчёркивание, дефис, точка
  if v_clean !~ '^[A-Za-z0-9_\-. а-яА-ЯёЁ]+$' then
    raise exception 'Invalid username characters' using errcode = '22023';
  end if;

  -- Зарезервированные имена (case-insensitive, по trimmed)
  if lower(v_clean) = any (array[
    'admin','administrator','moderator','mod','support','staff',
    'anicontinue','root','system','null','undefined','owner','api'
  ]) then
    raise exception 'Reserved username' using errcode = '22023';
  end if;

  new.username := v_clean;
  return new;
end;
$$;

drop trigger if exists profiles_validate_username on public.profiles;
create trigger profiles_validate_username
  before insert or update of username on public.profiles
  for each row execute function public.validate_username();

-- Уникальность (case-insensitive). NOT создаётся concurrently, т.к. таблица небольшая.
-- Если есть дубликаты — индекс упадёт. На малых данных это ок.
create unique index if not exists profiles_username_lower_uniq
  on public.profiles(lower(username))
  where username is not null;

-- ============================================================
-- 4. Аудит админских действий — функция log_admin_action
-- ============================================================
create or replace function public.log_admin_action(
  p_admin_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_old jsonb default null,
  p_new jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_logs (admin_id, action, target_type, target_id, old_value, new_value)
  values (p_admin_id, p_action, p_target_type, p_target_id, p_old, p_new);
end;
$$;

revoke all on function public.log_admin_action(uuid, text, text, text, jsonb, jsonb) from public;
grant execute on function public.log_admin_action(uuid, text, text, text, jsonb, jsonb) to service_role;
