-- 023_story_bible.sql
-- Story Bible — многослойная память для длинных историй (30+ глав).
-- Обеспечивает Claude контекстом всей пользовательской истории, а не только
-- последних 5 глав.

-- Сводка всей истории для данного пользователя×аниме.
-- Обновляется автоматически после каждой новой главы (фоновый вызов Claude).
CREATE TABLE IF NOT EXISTS public.story_bibles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id    bigint NOT NULL,
  summary     text,          -- 500-1500 слов: что происходит в истории в целом
  plot_arc    text,          -- главная сюжетная арка
  world_state text,          -- текущее состояние мира после последней главы
  total_chapters integer DEFAULT 0,
  updated_at_chapter_id uuid,
  updated_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

-- Постоянные персонажи, которых пользователь вписал в историю.
-- Аккумулируются из scene_params.customCharacters по всем главам.
CREATE TABLE IF NOT EXISTS public.story_characters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id         bigint NOT NULL,
  name             text NOT NULL,
  role             text,               -- описание/роль персонажа
  current_status   text DEFAULT 'active',  -- active / dead / missing / changed
  first_chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  last_chapter_id  uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(user_id, anime_id, name)
);

-- Ключевые события истории (plot points с весом важности).
-- Топ-10 по importance включаются в контекст каждой новой главы.
CREATE TABLE IF NOT EXISTS public.story_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id    bigint NOT NULL,
  chapter_id  uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  event_type  text CHECK (event_type IN (
                'plot-point', 'death', 'meeting', 'conflict',
                'resolution', 'revelation', 'other'
              )),
  description text NOT NULL,
  importance  integer DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  created_at  timestamptz DEFAULT now()
);

-- Индексы для быстрого lookup при построении контекста
CREATE INDEX IF NOT EXISTS idx_story_bibles_user_anime
  ON public.story_bibles(user_id, anime_id);

CREATE INDEX IF NOT EXISTS idx_story_characters_user_anime
  ON public.story_characters(user_id, anime_id);

CREATE INDEX IF NOT EXISTS idx_story_events_user_anime_importance
  ON public.story_events(user_id, anime_id, importance DESC);

-- RLS: пользователь видит и пишет только своё
ALTER TABLE public.story_bibles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_events    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own story_bibles" ON public.story_bibles
  USING (auth.uid() = user_id);

CREATE POLICY "Users own story_characters" ON public.story_characters
  USING (auth.uid() = user_id);

CREATE POLICY "Users own story_events" ON public.story_events
  USING (auth.uid() = user_id);
