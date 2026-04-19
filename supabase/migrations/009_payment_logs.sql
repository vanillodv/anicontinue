-- Payment logs table for YooKassa integration
create table public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id text not null unique,          -- YooKassa payment ID
  purchase_type text not null,              -- 'plan' | 'pack'
  purchase_id text not null,               -- plan/pack id, e.g. 'fan' or 'pack_30'
  amount integer not null,                 -- RUB
  status text not null default 'pending',  -- 'pending' | 'succeeded' | 'cancelled'
  idempotency_key text,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- Index for quick lookups
create index payment_logs_user_id_idx on public.payment_logs(user_id);
create index payment_logs_payment_id_idx on public.payment_logs(payment_id);

-- RLS
alter table public.payment_logs enable row level security;

-- Admins can see all
create policy "Admins read payment logs"
  on public.payment_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.plan in ('admin','super_admin')
    )
  );

-- Users can see their own
create policy "Users read own payment logs"
  on public.payment_logs for select
  using (user_id = auth.uid());

-- Service role bypasses RLS (used by webhook)
