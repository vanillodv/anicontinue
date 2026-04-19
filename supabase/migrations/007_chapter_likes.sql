-- Таблица лайков (уникальный лайк на главу от пользователя)
CREATE TABLE IF NOT EXISTS public.chapter_likes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

ALTER TABLE public.chapter_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own likes" ON public.chapter_likes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes" ON public.chapter_likes
  FOR SELECT USING (true);

-- Денормализованный счётчик для быстрой сортировки
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Функция обновления счётчика
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chapters SET likes_count = likes_count + 1 WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chapters SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.chapter_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.chapter_likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.chapter_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();
