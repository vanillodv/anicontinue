CREATE TABLE IF NOT EXISTS public.analytics_daily (
  date date PRIMARY KEY,
  new_users integer DEFAULT 0,
  new_chapters integer DEFAULT 0,
  cost_usd numeric(10,4) DEFAULT 0,
  active_users integer DEFAULT 0
);
