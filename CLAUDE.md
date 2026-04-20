@AGENTS.md

# AniContinue — Project Memory

## Стек
- **Frontend/Backend**: Next.js 15 App Router (TypeScript)
- **БД + Auth**: Supabase (PostgreSQL + RLS + Auth)
- **AI**: Anthropic Claude (streaming через Edge Runtime)
- **Деплой**: Vercel (auto-deploy из GitHub)
- **Домен**: www.anicontinue.ru (DNS через Vercel nameservers)
- **Репозиторий**: github.com/vanillodv/anicontinue

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
| 014_generation_errors.sql | ⚠️ уточнить | Лог ошибок генерации |

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
