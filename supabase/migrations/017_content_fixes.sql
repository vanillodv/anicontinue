-- 017_content_fixes.sql
-- Мелкие фиксы data-quality, найденные в аудите 21.04.2026:
--   - Орфография в anime.title_ru: «Твое»→«Твоё», «Унесенные»→«Унесённые»
--   - Срез markdown-префикса «# ...» из chapter.title (генератор иногда оставлял)
--   - Trim лидирующих \n в chapter.content (для корректного preview в community)

-- 1. Орфография в каталоге аниме
update public.anime set title_ru = 'Твоё имя'             where id = 32281 and title_ru = 'Твое имя';
update public.anime set title_ru = 'Унесённые призраками' where id = 199   and title_ru = 'Унесенные призраками';

-- 2. Срез лидирующего «#» из заголовков глав (markdown-остатки генератора)
update public.chapters
   set title = regexp_replace(title, '^\s*#+\s*', '')
 where title ~ '^\s*#';

-- 3. Trim ведущих пробелов/переносов в content глав (влияет на preview)
update public.chapters
   set content = regexp_replace(content, '^\s+', '')
 where content ~ '^\s';
