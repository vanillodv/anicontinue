-- Лог начислений генераций (донаты, ручные начисления)
CREATE TABLE IF NOT EXISTS generation_grants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount     INT NOT NULL,
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE generation_grants ENABLE ROW LEVEL SECURITY;
-- Только через service role (admin API)
