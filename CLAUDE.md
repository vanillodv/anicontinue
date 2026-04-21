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
| 019_prompt_v3_multi_fewshot.sql | ✅ выполнена | v3.0 с 3 few-shot примерами (drama AoT / romance Your Name / action HxH). Активация: `update ai_prompts set is_active = (version = '3.0-multi-fewshot')` |
| 020_curated_prompts_top10.sql | ⏳ ожидает применения user | `prompt_template` для топ-10: Эдвард не высокий, Санджи не бьёт женщин, Ушио ≠ Ушуу |
| 021_humanize_seed_data.sql | ⏳ ожидает применения user | Русификация ников 10 seed-авторов (Аки, ОТП навсегда, Тоторовна, Полуночник, Кёко-сан, Фонарщик, Рина К., Цукина, Отаку 2099, Канонист) + рандом `created_at` глав по последним 45 дням |

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
- `2770c71` pricing: убрать блок «Ориентировочные суммы» с 3 карточками
- `b548b88` migration 021: русификация seed-никнеймов + рандом created_at
- `878f86d` seed-script: max_tokens 3500→5000 + толерантный парсер + retry
- `56c5911` script: seed-community-chapters — 10 demo-авторов × 30 глав
- `b628f9c` script: автоперевод title_ru через Claude Haiku
