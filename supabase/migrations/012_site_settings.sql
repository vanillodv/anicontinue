-- Таблица настроек сайта (key-value)
CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: только сервисный ключ имеет доступ
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Только аутентифицированные admins могут читать через service role
-- (API routes используют service role, поэтому RLS не мешает)

-- Начальные значения
INSERT INTO site_settings (key, value) VALUES
  ('default_chapters_limit', '3'),
  ('registration_enabled',   'true'),
  ('maintenance_mode',        'false'),
  ('site_notice',             '')
ON CONFLICT (key) DO NOTHING;
