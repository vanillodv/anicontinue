CREATE TABLE IF NOT EXISTS generation_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  anime_id      INT,
  error_type    TEXT NOT NULL, -- 'ai_error' | 'db_error' | 'stream_error' | 'limit_reached' | 'timeout'
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE generation_errors ENABLE ROW LEVEL SECURITY;
-- Чтение только через service role (admin API)
