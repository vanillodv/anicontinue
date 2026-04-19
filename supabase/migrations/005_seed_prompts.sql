-- 005_seed_prompts.sql
-- Изначальный системный промпт для генерации аниме-глав
INSERT INTO public.ai_prompts (version, system_prompt, is_active)
SELECT 'v1.0-alpha', 'Ты автор фанфика. Пиши ТОЛЬКО на русском. Формат строго: <title>Название</title><content>Текст</content><summary>Сводка для контекста</summary>. PG-13, без галлюцинаций канона.', true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_prompts WHERE is_active = true);
