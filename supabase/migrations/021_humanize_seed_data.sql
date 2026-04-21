-- 021_humanize_seed_data.sql
-- Делаем seed-данные более органичными:
--   1) Русские ники у 10 demo-авторов (вместо английских/транслитерированных)
--   2) Рандомизируем created_at всех их глав по последним 45 дням
--   (иначе на главной и в /community все главы с одной датой — выглядит как seed-дамп)

-- ═══════════════════════════════════════════════════════════════════
-- 1. Русификация ников. Идентификация по email-паттерну seed.*@anicontinue-demo.local
-- ═══════════════════════════════════════════════════════════════════
update public.profiles p
   set username = case au.email
     when 'seed.aki@anicontinue-demo.local'       then 'Аки'
     when 'seed.shipper@anicontinue-demo.local'   then 'ОТП навсегда'
     when 'seed.ghibli@anicontinue-demo.local'    then 'Тоторовна'
     when 'seed.midnight@anicontinue-demo.local'  then 'Полуночник'
     when 'seed.kyoko@anicontinue-demo.local'     then 'Кёко-сан'
     when 'seed.paper@anicontinue-demo.local'     then 'Фонарщик'
     when 'seed.frame@anicontinue-demo.local'     then 'Рина К.'
     when 'seed.ronin@anicontinue-demo.local'     then 'Цукина'
     when 'seed.otaku@anicontinue-demo.local'     then 'Отаку 2099'
     when 'seed.canon@anicontinue-demo.local'     then 'Канонист'
   end
  from auth.users au
 where p.id = au.id
   and au.email like 'seed.%@anicontinue-demo.local';

-- ═══════════════════════════════════════════════════════════════════
-- 2. Рандомизация created_at по последним 45 дням.
--    Каждая глава получает случайный момент в диапазоне [now()-45d, now()-1h],
--    чтобы порядок глав и дат выглядел живым.
-- ═══════════════════════════════════════════════════════════════════
update public.chapters c
   set created_at = now() - (random() * interval '45 days') - interval '1 hour'
  from auth.users au
 where c.user_id = au.id
   and au.email like 'seed.%@anicontinue-demo.local';

-- Проверка результата (возвращается 10 строк с новыми никами + счётчик глав):
select p.username, count(c.id) as chapter_count,
       min(c.created_at)::date as oldest,
       max(c.created_at)::date as newest
  from public.profiles p
  left join public.chapters c on c.user_id = p.id
  join auth.users au on au.id = p.id
 where au.email like 'seed.%@anicontinue-demo.local'
 group by p.username
 order by chapter_count desc;
