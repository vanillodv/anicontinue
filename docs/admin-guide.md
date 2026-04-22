# AniContinue — Руководство администратора

## Что такое AniContinue

Веб-сайт, где пользователи генерируют продолжения аниме с помощью искусственного интеллекта.
Пользователь выбирает аниме → настраивает параметры сцены → AI пишет главу в стиле оригинала.
Главы можно публиковать в общую ленту сообщества.

---

## Из чего состоит сайт

```
Пользователь (браузер)
    ↓
Cloudflare  ← защита, кеш статики, TLS-сертификат для домена
    ↓
YC Serverless Container  ← сам сайт (Next.js)
    ↓
Supabase  ← база данных и авторизация
Anthropic Claude  ← AI для генерации глав
```

---

## Сервисы и их роль

### 1. Cloudflare (cloudflare.com)
**Что делает:** стоит между пользователями и сервером. Выдаёт HTTPS-сертификат для `www.anicontinue.ru`, кеширует статические файлы (картинки, JS, CSS) чтобы не гонять их через сервер каждый раз.

**Аккаунт:** vanillo1985@yandex.ru

**Важные настройки:**
- DNS → CNAME `www` → `bbaauig6dsdkj15nrto0.containers.yandexcloud.net`
- SSL/TLS → Full
- Cache Rules → `/_next/static/*` кешируется на 1 год

**Когда заходить:** при смене хостинга (поменять CNAME), при проблемах с SSL.

---

### 2. Yandex Cloud Serverless Containers (console.yandex.cloud)
**Что делает:** запускает сам сайт в Docker-контейнере. "Serverless" означает — контейнер спит когда нет запросов и просыпается при первом обращении (cold start ~3-5 сек при включённом UptimeRobot).

**Папка:** anicontinue (b1gkv4e5631hr6qvtrau)

**Контейнер:** anicontinue-test (bbaauig6dsdkj15nrto0)

**Прямой URL контейнера:** `https://bbaauig6dsdkj15nrto0.containers.yandexcloud.net`

**Параметры контейнера:**
- RAM: 1 GB
- CPU: 1 ядро
- Таймаут запроса: 90 секунд
- Одновременных запросов: 10

**Container Registry:** `cr.yandex/crpd88pqe87huknbsgsk/anicontinue` — хранилище Docker-образов сайта.

**Бесплатный лимит:** 1 млн запросов/мес, 10 GB×час RAM/мес. При малом трафике — бесплатно.

**Когда заходить:** посмотреть логи контейнера, изменить параметры (RAM, таймаут), откатить ревизию.

**Как посмотреть логи:**
YC Console → Serverless Containers → anicontinue-test → Логи

---

### 3. Supabase (supabase.com / app.supabase.com)
**Что делает:** база данных (PostgreSQL) + авторизация пользователей. Хранит всё: пользователей, главы, аниме, настройки сайта.

**Проект:** zafbjeslpkprdqaiynqs

**URL проекта:** `https://zafbjeslpkprdqaiynqs.supabase.co`

**Важные настройки:**
- Authentication → URL Configuration → Site URL: `https://www.anicontinue.ru`
- Authentication → URL Configuration → Redirect URLs: `https://www.anicontinue.ru/**`

**Когда заходить:**
- Посмотреть/изменить данные в БД (SQL Editor)
- Применить миграции
- Управлять пользователями (блокировка через Auth)
- Проверить ключи API (Settings → API)

**Два ключа API:**
- `anon key` — публичный, вшивается в код сайта, браузер его видит
- `service_role key` — секретный, только на сервере, обходит все ограничения доступа

---

### 4. Anthropic Claude API (console.anthropic.com)
**Что делает:** AI-модель которая пишет главы. Используется модель `claude-haiku-4-5-20251001` — быстрая и дешёвая.

**Стоимость:** ~$0.004 за 100 генераций (очень дёшево).

**Когда заходить:** сменить API-ключ, посмотреть расходы.

---

### 5. GitHub (github.com/vanillodv/anicontinue)
**Что делает:** хранит код сайта. При каждом push в ветку `main` автоматически:
1. Собирает Docker-образ
2. Публикует его в YC Container Registry
3. Деплоит новую ревизию в YC Serverless Container

**GitHub Actions (автодеплой):**
- `.github/workflows/deploy-yc.yml` — деплой в YC при push в main
- `.github/workflows/cron-aggregate.yml` — ежедневный запуск агрегации статистики

**GitHub Secrets (секреты для деплоя):**
| Секрет | Что это |
|--------|---------|
| `YC_SA_JSON` | Ключ сервисного аккаунта YC для CI/CD |
| `YC_CONTAINER_ID` | ID контейнера в YC |
| `YC_REGISTRY_ID` | ID Container Registry в YC |
| `YC_FOLDER_ID` | ID папки в YC |
| `YC_SA_RUNNER_ID` | ID сервисного аккаунта для запуска контейнера |
| `SUPABASE_SERVICE_ROLE_KEY` | Секретный ключ Supabase |
| `ANTHROPIC_API_KEY` | Ключ Anthropic Claude API |
| `CRON_SECRET` | Секрет для защиты cron-эндпоинта |

---

### 6. UptimeRobot (uptimerobot.com)
**Что делает:** каждые 5 минут стучится на `/api/settings/public` чтобы контейнер не засыпал. Без него первый пользователь после простоя ждёт ~12 секунд cold start.

**Монитор:** `https://bbaauig6dsdkj15nrto0.containers.yandexcloud.net/api/settings/public`

---

### 7. RU-CENTER (nic.ru)
**Что делает:** регистратор домена `anicontinue.ru`. DNS-серверы делегированы на Cloudflare.

**Срок:** до 19 апреля 2027 г.

**Nameservers:** `isaac.ns.cloudflare.com`, `mia.ns.cloudflare.com`

---

## Как работает авторизация

1. Пользователь нажимает «Войти через Google»
2. Браузер перенаправляется на Google → пользователь выбирает аккаунт
3. Google возвращает пользователя на Supabase (`zafbjeslpkprdqaiynqs.supabase.co`)
4. Supabase перенаправляет на наш сайт (`/auth/callback`)
5. Сайт создаёт сессию (cookie) и показывает главную

**Проблема на некоторых мобильных сетях:** шаг 3 требует доступа к `supabase.co` который может быть заблокирован. Email/пароль работает на всех сетях.

---

## Как работает генерация глав

1. Пользователь выбирает аниме и настраивает параметры
2. Сайт проверяет: авторизован ли, не забанен ли, есть ли лимит генераций
3. Запрос уходит в Anthropic Claude Haiku
4. Claude пишет главу (title + content) в формате XML
5. Глава сохраняется в базу данных Supabase
6. Счётчик использованных генераций увеличивается на 1

**Лимиты:** новые пользователи получают 3 бесплатные генерации. Увеличить можно через `/admin/users`.

---

## Монетизация

Через **Boosty** — пользователь донатит, администратор вручную начисляет генерации через `/admin/users/[id]/grant`.

YooKassa и подписки отложены на будущее.

---

## Адрес панели администратора

`https://www.anicontinue.ru/admin`

Доступ только для пользователей с ролью `admin` или `super_admin` в таблице `profiles`.

**Разделы:**
| URL | Что там |
|-----|---------|
| `/admin` | Дашборд: статистика, последние главы |
| `/admin/users` | Пользователи: роли, баны, начисление генераций |
| `/admin/moderation` | Модерация публичных глав |
| `/admin/anime` | Каталог аниме |
| `/admin/ai` | AI-промпты |
| `/admin/analytics` | Расходы на AI, топ аниме |
| `/admin/settings` | Настройки сайта (регистрация, режим обслуживания) |
| `/admin/errors` | Лог ошибок генерации |

---

## Частые операции

### Выдать пользователю дополнительные генерации
`/admin/users` → найти пользователя → Grant → ввести количество

### Забанить пользователя
`/admin/users` → найти → Ban

### Включить/выключить регистрацию
`/admin/settings` → registration_enabled → true/false

### Включить режим обслуживания
`/admin/settings` → maintenance_mode → true

### Применить миграцию БД
Supabase Dashboard → SQL Editor → вставить SQL из файла `supabase/migrations/XXX.sql` → Run

### Задеплоить новую версию сайта
```bash
git push origin main
```
GitHub Actions сделает всё автоматически (~3 минуты).

### Откатить на предыдущую версию
YC Console → Serverless Containers → anicontinue-test → Ревизии → выбрать предыдущую → Сделать активной

### Посмотреть логи сайта
YC Console → Serverless Containers → anicontinue-test → Логи

---

## Стоимость в месяц (ориентировочно)

| Сервис | Стоимость |
|--------|-----------|
| YC Serverless Containers | 0 ₽ (в рамках free tier) |
| YC Container Registry | ~1 ₽ (хранение образа ~300 MB) |
| Supabase | $0 (Free plan: 500 MB БД, 50k auth users) |
| Cloudflare | $0 (Free plan) |
| UptimeRobot | $0 (Free plan) |
| RU-CENTER домен | ~800 ₽/год |
| Anthropic Claude | ~$0.004 за 100 генераций |

**Итого при малом трафике: ~70 ₽/мес (домен) + расходы на AI**

---

## Контакты и ресурсы

- **Репозиторий:** github.com/vanillodv/anicontinue
- **YC Console:** console.yandex.cloud
- **Supabase:** app.supabase.com
- **Cloudflare:** cloudflare.com
- **Anthropic:** console.anthropic.com
- **UptimeRobot:** uptimerobot.com
- **RU-CENTER:** nic.ru
