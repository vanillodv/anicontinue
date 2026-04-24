-- 024_coherence_fixes.sql
-- Фиксы связности повествования: статус персонажей, ветки альтернативных концовок.

-- Быстрый lookup по статусу (для фильтрации dead/active персонажей)
CREATE INDEX IF NOT EXISTS idx_story_characters_lookup
  ON public.story_characters(user_id, anime_id, current_status);

-- Флаг альтернативной ветки на главе (для UI и аналитики)
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS is_alternative_branch BOOLEAN DEFAULT FALSE;

-- Расширяем допустимые статусы персонажей (было: active/dead/missing/changed)
-- Теперь: alive/dead/missing/transformed/left-story/unknown
-- Также оставляем 'active' для обратной совместимости старых записей.
-- Ничего ALTER не нужно — current_status это просто text без CHECK.
