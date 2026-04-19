-- 002_security_tables.sql
-- Безопасное расширение схемы: soft-delete, лимиты, AI/Admin/Analytics таблицы, RLS, индексы.
-- 1. Soft-delete & Role (additive only)
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin'));
-- 2. Auto-reset limits trigger
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chapters_reset_at timestamptz DEFAULT NOW() + interval '30 days';
CREATE OR REPLACE FUNCTION public.check_and_reset_chapters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chapters_reset_at <= NOW() THEN
    NEW.chapters_used := 0;
    NEW.chapters_reset_at := NOW() + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS auto_reset_chapters ON public.profiles;
CREATE TRIGGER auto_reset_chapters
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_and_reset_chapters();
-- 3. New Tables (AI, Admin, Analytics)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  system_prompt text NOT NULL,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  chapter_id uuid REFERENCES public.chapters(id),
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,4),
  model text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.analytics_events_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time timestamptz DEFAULT now(),
  event_name text NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  session_id text NOT NULL,
  event_data jsonb DEFAULT '{}',
  ip_hash text,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_active ON public.chapters(created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_name_time ON public.analytics_events_raw(event_name, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
-- 5. RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events_raw ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage AI prompts" ON public.ai_prompts
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Users can view own AI usage" ON public.ai_usage_logs
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Anyone can view system config" ON public.system_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can update system config" ON public.system_config
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Users can insert analytics" ON public.analytics_events_raw
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view analytics" ON public.analytics_events_raw
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
