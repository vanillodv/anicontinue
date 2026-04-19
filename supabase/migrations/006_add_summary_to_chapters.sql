-- 006_add_summary_to_chapters.sql
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS summary text;
