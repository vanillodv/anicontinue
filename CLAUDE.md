@AGENTS.md

# AniContinue — Project Memory

## Стек
- **Frontend/Backend**: Next.js 16 App Router (TypeScript) — **не 15**, см. AGENTS.md
- **БД + Auth**: Supabase (PostgreSQL + RLS + Auth)
- **AI**: Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), streaming через Edge Runtime
- **Деплой**: Vercel (auto-deploy из GitHub, ветка main)
- **Домен**: www.anicontinue.ru (DNS через Vercel nameservers)
- **Репозиторий**: github.com/vanillodv/anicontinue

### Next.js 16 breaking changes (важно!)
- **Middleware → Proxy**: используется `src/proxy.ts`, НЕ `middleware.ts`. Наличие обоих файлов одновременно = build fail.
- Перед правками нестандартных API Next.js читать `node_modules/next/dist/docs/` — поведение отличается от Next 15.

## Архитектура

### Supabase клиенты
- `src/lib/supabase/server.ts` — серверный клиент (с RLS, читает cookies)
- `src/lib/supabase/client.ts` — клиентский клиент (браузер)
- `src/lib/admin/guard.ts` — `serviceClient()` обходит RLS (service role key), `requireAdmin()` проверяет роль

### ВАЖНО: RLS на profiles
Таблица `profiles` имеет RLS: пользователь видит только свой профиль.
При JOIN с profiles для получения username других пользователей ВСЕГДА использовать `serviceClient()`:
- `src/app/api/community/route.ts` ✅
- `src/app/page.tsx` (recent chapters) ✅
- `src/app/anime/[id]/AnimeChaptersFeed.tsx` ✅

### Edge Runtime
`src/app/api/generate/route.ts` работает на Edge (`export const runtime = 'edge'`).
Нельзя использовать Node.js API. Supabase клиент создаётся inline через `createClient` из `@supabase/supabase-js`.

## Переменные окружения (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=https://www.anicontinue.ru
```

## База данных — таблицы

### profiles
```sql
id uuid (references auth.users)
username text
plan text default 'free'
role text  -- 'user', 'moderator', 'admin', 'super_admin', 'banned'
chapters_used integer default 0
chapters_limit integer default 3
created_at timestamptz
```

### chapters
```sql
id uuid, user_id uuid, anime_id bigint
title text, content text, summary text
rating integer, likes_count integer, comments_count integer
is_public boolean, is_deleted boolean
scene_params jsonb
```

### site_settings (migration 012)
```sql
key text primary key
value text
-- Записи: registration_enabled, maintenance_mode, default_chapters_limit, site_notice
```

### generation_grants (migration 013)
```sql
id uuid, admin_id uuid, user_id uuid
amount integer, note text
created_at timestamptz
```

### generation_errors (migration 014)
```sql
id uuid, user_id uuid, anime_id bigint
error_type text  -- 'ai_error', 'stream_error', 'db_error', 'timeout', 'limit_reached'
error_message text
created_at timestamptz
```

### ai_usage_logs
```sql
id, user_id, anime_id, tokens_used, cost_usd, created_at
```

## Миграции
| Файл | Статус | Содержание |
|------|--------|-----------|
| 001-008 | ✅ выполнены | Базовая схема, RLS, лайки, аналитика |
| 012_site_settings.sql | ✅ выполнена | Настройки сайта |
| 013_generation_grants.sql | ✅ выполнена | История начислений |
| 014_generation_errors.sql | ✅ выполнена | Лог ошибок генерации |
| 015_security_hardening.sql | ✅ выполнена | Trigger `prevent_privilege_escalation`, RPC `consume_chapter`, `refund_chapter`, `apply_payment`, таблица `rate_limits` + RPC `check_rate_limit` |
| 016_security_hardening_v2.sql | ✅ выполнена | auth.uid check в consume_chapter, RLS на payment_logs, trigger `validate_username`, RPC `log_admin_action` |
| 017_content_fixes.sql | ✅ выполнена | Орфография title_ru (Твоё/Унесённые — ё, а не е) |
| 018_better_prompt.sql | ✅ выполнена | ai_prompts v2.0-anti-cliche |
| 019_prompt_v3_multi_fewshot.sql | ✅ выполнена + активирована | v3.0 с 3 few-shot примерами (drama AoT / romance Your Name / action HxH). Активация: `update ai_prompts set is_active = (version = '3.0-multi-fewshot')` |
| 020_curated_prompts_top10.sql | ✅ выполнена | `prompt_template` для топ-10 (FMA Братство, Врата Штейна, HxH, AoT, Кланнад, Форма голоса, Унесённые призраками, Твоё имя, Первый шаг + ещё). Проверено через API: 9 тайтлов в топ-20 имеют template. |
| 021_humanize_seed_data.sql | ✅ выполнена | Русификация ников 10 seed-авторов (Аки, ОТП навсегда, Тоторовна, Полуночник, Кёко-сан, Фонарщик, Рина К., Цукина, Отаку 2099, Канонист) + рандом `created_at` глав. Проверено: 11 разных дат в топ-40 /community. |

### Как применять миграции
Supabase Dashboard → SQL Editor → вставить содержимое файла → Run. В PowerShell/bash НЕ запускать.

## Подключённые фичи

### Настройки сайта (site_settings)
- `maintenance_mode` — режим обслуживания, проверяется в `src/app/layout.tsx`
- `registration_enabled` — блокирует регистрацию в `src/app/auth/callback/route.ts` и `src/app/login/page.tsx`
- `default_chapters_limit` — лимит генераций для новых пользователей
- `site_notice` — баннер на всём сайте

### Генерация глав
- Edge функция `/api/generate` со стримингом
- Проверки: авторизация → бан → лимит → генерация
- Логирование ошибок в `generation_errors`
- Формат ответа: SSE JSON lines `{type: 'title'|'content'|'done', payload}`

### Бан пользователей
- `POST /api/admin/users/[id]/ban` — устанавливает `role='banned'` в profiles + пытается забанить в Supabase Auth
- `DELETE /api/admin/users/[id]/ban` — снимает бан
- В `/api/generate` проверяется `profile.role === 'banned'`

### Начисление генераций
- `POST /api/admin/users/[id]/grant` — увеличивает `chapters_limit`, логирует в `generation_grants`

### AI-промпт (src/lib/prompts/master.ts)
- Активная версия: **v3.0-multi-fewshot** (миграция 019). 3 few-shot примера разных жанров.
- `anime.prompt_template` — курированные знания о тайтле (характер героев, тон, запреты). Заполнено для топ-10 (миграция 020). Вшивается в system prompt блоком `КУРИРОВАННЫЕ ЗНАНИЯ О ТАЙТЛЕ`.
- Формат ответа — XML: `<title>...</title><content>...</content><summary>...`
- max_tokens: **3500** в /api/generate (не 1200 — иначе глава обрывается). maxDuration: **60** (не 10).
- При парсинге XML — толерантный: если `</content>` отсутствует, брать до `<summary>` или до конца.

### Скрипты наполнения контентом (`scripts/`)
| Скрипт | Что делает |
|--------|-----------|
| `import-anime-from-jikan.mjs` | 10 страниц × 25 = до 250 тайтлов с Jikan API. **В БД уже: 244.** Retry с backoff (Jikan из РФ падает), 15s timeout, валидация service_role JWT (150+ символов, regex `^eyJ[A-Za-z0-9_\-.]{150,}$`). |
| `translate-titles-with-llm.mjs` | Claude Haiku переводит `title_ru` батчами по 20. **Переведено: 168.** Официальные названия (Атака Титанов, Унесённые призраками, Твоё имя) + буква «ё». Стоимость ~$0.004 за 100 тайтлов. |
| `translate-synopsis-with-llm.mjs` | Claude Haiku переводит `synopsis` (детект по отсутствию кириллицы), батч 5, max_tokens 3500. **Переведено: 188 / 0 ошибок.** Канонические транслиты имён (Сироганэ, Кагуя, Йегер, Удзумаки). Стоимость ~$0.05 за 100 тайтлов. |
| `seed-community-chapters.mjs` | 10 demo-авторов × 30 глав в `/community`. Email-паттерн `seed.*@anicontinue-demo.local`. max_tokens: **5000** (иначе XML обрезается), retry 2 попытки на короткий контент. **Сгенерировано: 29+ глав.** |

**Запуск скриптов (из корня репо):**
```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="..."
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."  # полный JWT 200+ символов из Vercel
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."     # полный ключ 100+ символов
node scripts/<script>.mjs
```

## Админ панель (`/admin`)
Роли: `admin`, `super_admin` — проверяется через `requireAdmin()` / `requireAdminPage()`

Разделы:
| URL | Содержание |
|-----|-----------|
| `/admin` | Дашборд: статистика, последние главы |
| `/admin/users` | Пользователи: email, роль, бан, начисления |
| `/admin/moderation` | Модерация публичных глав |
| `/admin/anime` | Каталог аниме |
| `/admin/ai` | AI промпты |
| `/admin/analytics` | График расходов, топ аниме |
| `/admin/grants` | История начислений |
| `/admin/errors` | Лог ошибок генерации |
| `/admin/suggestions` | Пожелания пользователей |
| `/admin/settings` | Настройки сайта |

## OAuth
- **Google** — работает ✅
- **Yandex/VK** — НЕ работает (Supabase поддерживает только OIDC, у Яндекса/VK нет OIDC discovery endpoint)

## Supabase настройки
- **Site URL**: `https://www.anicontinue.ru`
- **Redirect URLs**: `https://www.anicontinue.ru/**`, `https://*.vercel.app/**`

## Деплой

### DNS
- Домен `anicontinue.ru` зарегистрирован на RU-CENTER
- Nameservers изменены на `ns1.vercel-dns.com` / `ns2.vercel-dns.com`
- Vercel управляет DNS автоматически
- `anicontinue.ru` редиректит на `www.anicontinue.ru`

### GitHub → Vercel
Каждый push в `main` автоматически деплоится на Vercel.

## Известные особенности

### serviceClient в Server Components
При использовании `serviceClient()` из `@/lib/admin/guard` в Server Components (не API routes) — это нормально и безопасно, т.к. код выполняется только на сервере.

### `chapters_used` не декрементируется
При удалении главы счётчик `chapters_used` не уменьшается — это сделано намеренно.

### `is_deleted` vs удаление
Главы не удаляются физически, ставится флаг `is_deleted = true`.

### Профили создаются в двух местах
1. `src/app/auth/callback/route.ts` — для OAuth (Google)
2. Supabase trigger или ручное создание — для email/password (нужно проверить)

## Дизайн / CSS

### Сумиэ-тема (японский ч/б + киноварь)
CSS-переменные (в `globals.css`): `--paper`, `--paper-2`, `--ink`, `--cinnabar` (#E85D4F), `--gold` (#DFB55E), `--ash`, `--line`, `--line-strong`.

Утилиты: `.ac-seal`, `.ac-eyebrow`, `.ac-btn`, `.ac-sec-num`, `.ac-card`, `.ac-card-inv`, `.ac-row`, `.ac-icon-btn`, `.legal-doc`.

### Шрифты (`src/app/layout.tsx`)
- `--font-serif` = **Playfair Display** (italic + cyrillic). **НЕ Fraunces** — Fraunces не поддерживает кириллицу, next/font падал при build. CSS-переменная называется `--font-fraunces` по историческим причинам, но внутри Playfair.
- `--font-mono` = JetBrains Mono
- `--font-jp` = Noto Serif JP (для kanji/акцентов)
- `--font-sans` = Manrope

## Критические уроки

### ⚠️ `onMouseEnter`/`onMouseLeave` в Server Components = 500
Next.js 16 не терпит inline-event handlers в server components. Симптом: SSR 500 по всему сайту.
- **Решение**: либо `"use client"` в компоненте, либо заменить hover на CSS-классы (`.ac-card`, `.ac-card-inv`).
- **Затронуто**: `Footer.tsx` → `"use client"`; `page.tsx`, `AnimeChaptersFeed.tsx` → CSS hover.

### ⚠️ Edge Runtime + max_tokens
`/api/generate` на Edge. Claude Haiku 4.5 при `max_tokens: 1200` **обрывает главу** → пользователь видит только первый абзац. Минимум **3500** для /api/generate, **5000** для seed-скрипта.
Также: `maxDuration: 60` обязательно, дефолтные 10s не хватает.

### ⚠️ RLS на profiles в JOIN
Любое место, где мы показываем username чужих пользователей → `serviceClient()`. Иначе JOIN вернёт null для всех чужих профилей.

### ⚠️ Прямой push в main из worktree
Ветка worktree `claude/*` tracked на `origin/main`. Для деплоя на Vercel:
```bash
git push origin HEAD:main
```
Это не force push — ветка отделена от main без дивергенции.

## Deferred (отложено на неопределённый срок)
По решению user'а отложены:
- **YooKassa** — интеграция оплаты
- **Самозанятость** — оформление ИП/самозанятого
- **Subscription** — месячная подписка
Текущая модель монетизации: **Boosty** (ручное начисление через `/admin/users/[id]/grant` после доната). Страница `/pricing` — только CTA на Boosty + FAQ, без карточек сумм/тарифов.

## История деплоев (последние ключевые)
- `b4701de` seo+img: починить sitemap/robots (vercel.app→anicontinue.ru) и проксировать остальные постеры (og:image соцсетей, /profile, /admin)
- `9e9a716` script: автоперевод synopsis через Claude Haiku (188/0 переведено)
- `22cfdbb` fix(img): проксировать myanimelist.net, а не только cdn.*
- `7fe9815` docs: зафиксировать текущее состояние проекта в CLAUDE.md
- `2770c71` pricing: убрать блок «Ориентировочные суммы» с 3 карточками
- `b548b88` migration 021: русификация seed-никнеймов + рандом created_at
- `878f86d` seed-script: max_tokens 3500→5000 + толерантный парсер + retry
- `56c5911` script: seed-community-chapters — 10 demo-авторов × 30 глав
- `b628f9c` script: автоперевод title_ru через Claude Haiku

## Полная карта проекта (актуальна на 2026-04-21)

### Статистика (из sitemap + API)
- **Аниме в БД:** 244 (sitemap режет до 200, лимит в `sitemap.ts`)
- **Публичных глав:** 62 (seed 29 + реальных ~33)
- **Seed-авторов:** 10 (email `seed.*@anicontinue-demo.local`)
- **Статических страниц в sitemap:** 3 (`/`, `/catalog`, `/community`)
- **Активных AI-промптов:** 1 из 3 (v3.0-multi-fewshot)

### Публичные страницы (/)
| Роут | Назначение |
|------|-----------|
| `/` | Главная — hero, популярные тайтлы, последние главы |
| `/catalog` | Каталог 244 тайтлов с поиском и пагинацией (20/страницу) |
| `/community` | Лента публичных глав от всех пользователей |
| `/anime/[id]` | Страница конкретного аниме — досье, последние главы, CTA |
| `/chapter/[id]` | Читалка главы с комментариями и лайками |
| `/pricing` | Поддержка проекта на Boosty (без тарифных карточек) |
| `/feedback` | Пожелания пользователей с голосованием |
| `/login` | Вход/регистрация (Google OAuth, email/password) |
| `/legal/*` | 5 юридических страниц: offer, privacy, refund, terms, license |
| `/maintenance` | Страница-заглушка при `maintenance_mode=true` |
| `/auth/registration-closed` | При `registration_enabled=false` |
| `/auth/auth-code-error` | Фоллбек OAuth |
| `/payment/success`, `/payment/cancel` | Callback YooKassa (пока не используется) |

### Приватные (требуют auth)
| Роут | Кто видит |
|------|----------|
| `/profile` | Свой профиль — статистика, главы, лимит |
| `/profile/history` | История всех своих глав по тайтлам |
| `/settings` | Username, email, экспорт данных |
| `/admin` | Дашборд (только admin/super_admin) |
| `/admin/users` | Список пользователей, бан, начисления |
| `/admin/moderation` | Модерация публичных глав |
| `/admin/anime` | CRUD каталога |
| `/admin/ai` | Редактор AI-промптов |
| `/admin/analytics` | График расходов, топ аниме |
| `/admin/grants` | История начислений |
| `/admin/errors` | Лог ошибок генерации |
| `/admin/suggestions` | Модерация пожеланий |
| `/admin/settings` | Настройки сайта |

### API routes
| Категория | Endpoints |
|-----------|-----------|
| **Генерация** | `POST /api/generate` (Edge, streaming) |
| **Каталог** | `GET /api/anime/top?q=...` |
| **Главы** | `GET /api/community`, `GET/POST /api/chapter/[id]/{comments,like,rate}` |
| **Юзер** | `GET /api/user/me`, `POST /api/user/username`, `GET /api/user/export-data` |
| **Пожелания** | `GET/POST /api/suggestions`, `POST /api/suggestions/[id]/vote` |
| **Картинки** | `GET /api/img?url=...` (MAL-прокси с Referer) |
| **Настройки** | `GET /api/settings/public` |
| **Аналитика** | `POST /api/analytics/collect`, `GET /api/cron/aggregate` |
| **Платежи** | `POST /api/payment/{create,webhook}` (YooKassa, отложено) |
| **OAuth** | `GET /auth/callback` |
| **Админка** | 14 endpoint'ов в `/api/admin/*` |

### Таблицы БД
```
anime            — каталог (id, title_ru, title_en, title_jp, synopsis,
                   genres[], score, year, studio, episodes, status,
                   poster_url, prompt_template, ending_context)
profiles         — юзеры (id, username, role, chapters_used, chapters_limit, plan)
chapters         — главы (id, user_id, anime_id, title, content, summary,
                   rating, likes_count, comments_count, is_public, is_deleted,
                   scene_params jsonb)
chapter_likes    — лайки
chapter_comments — комментарии
ai_prompts       — промпты с версиями, is_active
ai_usage_logs    — расход токенов
site_settings    — key-value настройки сайта
generation_grants — история начислений админами
generation_errors — лог ошибок генерации
payment_logs     — история оплат
rate_limits      — счётчики для /api/generate
suggestions      — пожелания + голоса
analytics_daily  — агрегированная аналитика
```

### Компоненты (7 штук)
- `AnimeCard` — карточка в каталоге (fallback 続, score, genres)
- `CommentsSection` — комментарии к главе
- `ExamplePreview` — landing-демо с hardcoded AoT
- `CookieBanner`, `Footer` (`"use client"`), `Header` — layout
- `SceneConstructor` — UI для выбора настроений/сценариев при генерации

### Библиотеки (`src/lib/`)
- `supabase/{client,server}.ts` — SSR + browser clients
- `admin/guard.ts` — `requireAdmin()`, `serviceClient()`
- `admin/audit.ts` — логирование действий админа
- `claude/index.ts` — Anthropic SDK wrapper
- `prompts/master.ts` — система промпт-сборки с `prompt_template`
- `jikan/` — Jikan API клиент (для каталога)
- `analytics/track.ts` — клиентская аналитика
- `proxyImage.ts` — обёртка URL в `/api/img`
- `settings.ts` — чтение `site_settings`
- `validate.ts` — Zod схемы
- `plans.ts` — тарифы (free/pro)
- `genres.ts` — маппинг англ→рус жанров
- `data/seed-anime.ts` + `batches/` — **устаревший** seed (до Jikan)

### Скрипты (`scripts/`)
**Актуальные:**
- `import-anime-from-jikan.mjs` — импорт из Jikan (244 в БД)
- `translate-titles-with-llm.mjs` — Claude Haiku → title_ru (168)
- `translate-synopsis-with-llm.mjs` — Claude Haiku → synopsis (188)
- `seed-community-chapters.mjs` — 10 demo-авторов × N глав

**Устаревшие (one-shot fixes, кандидаты на удаление):**
- `add-anime.mjs`, `final-fix-anime.mjs`, `fix-posters.mjs`,
  `fix-wrong-anime.mjs`, `search-correct-ids.mjs`, `verify-anime.mjs`

## TODO / Технический долг

### 🔴 Критично (security / SEO)
1. **`/api/anime/seed` — публичный GET без auth**. Anon RLS не пускает
   запись, но endpoint бесполезен и тратит ресурсы при пинге ботов.
   **Действие:** удалить файл `src/app/api/anime/seed/route.ts` +
   `src/lib/data/seed-anime.ts` + `src/lib/data/batches/*`.
2. **Sitemap режет до 200 при 244 тайтлах** в `src/app/sitemap.ts:9`.
   `.limit(200)` — изменить на 500 или убрать.

### 🟡 Улучшения UX / контент
3. **OAuth только Google**. Email/password работает, но Yandex/VK не
   поддерживаются Supabase. Альтернатива — кастомный OAuth-endpoint,
   но это большая работа.
4. **Фильтры в каталоге** — сейчас только поиск по имени. Нет фильтра
   по жанру / году / студии / рейтингу.
5. **Мало публичных глав** — 62, из них 29 seed. Пользователи ещё не
   публикуют активно. Можно догенерить seed до 50–100.
6. **Проверить мобильную адаптацию** всех страниц. `@media (max-width: 1100px)`
   применён, но детали (header, hero-collage) могут ломаться на мобиле.
7. **Нет `og-image` для главной** — есть `/og-image.svg`, но это SVG.
   Telegram/VK плохо рендерят SVG превью. Сделать PNG 1200×630.

### 🟢 Nice to have
8. **Error monitoring (Sentry)** — сейчас ошибки только в `generation_errors`
   и серверных логах Vercel.
9. **Тесты** — ни unit, ни e2e. Для критичных мест (`/api/generate`,
   `consume_chapter` RPC) хорошо бы покрыть.
10. **Rate limit на `/api/img`** — бесплатный прокси без ограничений может
    быть завален ботами. Добавить `check_rate_limit` RPC.
11. **CSP header** — в `next.config.ts` есть базовые security headers,
    но нет `Content-Security-Policy`. XSS в пользовательских главах
    возможен (content хранится как plain text, но рендерится).
12. **AI-расходы: нет kill-switch** — если промпт зациклится или бот массово
    генерит, расходы на Anthropic могут взлететь. Нужен глобальный лимит
    через `ai_usage_logs` + cron-проверка.
13. **Тесты `/admin/*`** — нет smoke-тестов что защита `requireAdmin()` работает
    на всех 14 admin API-endpoints.

### 🔵 Cleanup / рефакторинг
14. Удалить устаревшие скрипты `scripts/*.mjs` (6 штук).
15. Удалить `src/lib/data/seed-anime.ts` и `batches/*` — после Jikan не нужны.
16. Проверить, создаются ли профили для email/password регистрации
    (в CLAUDE.md отмечено «нужно проверить»).

## Критические SEO-моменты (урок)
- В Vercel установлена `NEXT_PUBLIC_APP_URL`, НЕ `NEXT_PUBLIC_SITE_URL`.
  `sitemap.ts` и `robots.ts` должны читать именно `APP_URL` с fallback
  на прод-домен. Любой fallback на `*.vercel.app` = Google индексирует
  второй домен → дубль контента, штраф.
- `og:image` для соцсетей ВСЕГДА через `proxyImage()` → `/api/img?url=...`.
  MAL hotlink-режет прямые запросы без Referer → Telegram/Twitter/VK
  увидят 403 вместо превью.
- `metadataBase: new URL("https://www.anicontinue.ru")` в `layout.tsx`
  нужен чтобы относительные `/api/img?url=...` стали абсолютными в og:image.
