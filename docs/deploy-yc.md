# Деплой AniContinue в Yandex Cloud Serverless Containers

## Архитектура

```
Пользователь (РФ)
    ↓
Cloudflare Free (TLS, кеш статики)
    ↓ (только динамика)
YC Serverless Container
    ↓
Supabase / Anthropic API
```

**Почему Cloudflare, а не YC API Gateway:**
YC API Gateway — 100 000 запросов/мес бесплатно. Next.js на каждую страницу подтягивает ~10–15 файлов `.next/static/*`.
100k / 10 = 10 000 page-load/мес — исчерпается за неделю при малейшей нагрузке.
Cloudflare Free: запросы не лимитируются, статику кешируют edge-узлы, SSE проходит без буферизации.

---

## Часть 1 — Предварительная настройка в консоли YC

### 1.1 Container Registry

```bash
# Создать реестр
yc container registry create --name anicontinue

# Запомнить Registry ID (понадобится)
yc container registry list
```

### 1.2 Service Account для CI/CD (пуш образов + деплой ревизий)

```bash
# Создать SA
yc iam service-account create --name anicontinue-ci

# Папка (folder) — нужен folder-id
yc resource-manager folder list

# Роли для пуша в Container Registry
yc container registry add-access-binding \
  --name anicontinue \
  --service-account-name anicontinue-ci \
  --role container-registry.images.pusher

# Роль для деплоя ревизий
yc resource-manager folder add-access-binding \
  --id <FOLDER_ID> \
  --service-account-name anicontinue-ci \
  --role serverless.containers.editor

# Создать JSON-ключ (для GitHub Actions)
yc iam key create \
  --service-account-name anicontinue-ci \
  --output yc-sa-ci.json
# → содержимое файла yc-sa-ci.json кладём в GitHub Secret YC_SA_JSON
# ВАЖНО: не коммитить yc-sa-ci.json в git
```

### 1.3 Service Account для рантайма контейнера

```bash
# Отдельный SA чтобы контейнер мог читать CR и писать логи
yc iam service-account create --name anicontinue-runner

yc container registry add-access-binding \
  --name anicontinue \
  --service-account-name anicontinue-runner \
  --role container-registry.images.puller

# Логи в Cloud Logging (опционально но удобно)
yc resource-manager folder add-access-binding \
  --id <FOLDER_ID> \
  --service-account-name anicontinue-runner \
  --role logging.writer

# Запомнить ID runner SA
yc iam service-account get --name anicontinue-runner
```

### 1.4 Создать Serverless Container

```bash
yc serverless container create --name anicontinue
# Запомнить Container ID
```

### 1.5 Первый ручной деплой (проверочный)

```bash
# Авторизация в CR
yc container registry configure-docker

# Сборка образа
docker build -t cr.yandex/<REGISTRY_ID>/anicontinue:init .

# Пуш
docker push cr.yandex/<REGISTRY_ID>/anicontinue:init

# Деплой ревизии с env-переменными
yc serverless container revision deploy \
  --container-id <CONTAINER_ID> \
  --image cr.yandex/<REGISTRY_ID>/anicontinue:init \
  --service-account-id <RUNNER_SA_ID> \
  --memory 1024MB \
  --cores 1 \
  --execution-timeout 90s \
  --concurrency 10 \
  --environment "SUPABASE_SERVICE_ROLE_KEY=..." \
  --environment "ANTHROPIC_API_KEY=..." \
  --environment "CRON_SECRET=..."
```

### 1.6 Сделать контейнер публичным

YC консоль → Serverless Containers → anicontinue → вкладка «Обзор» →
«Запуск без авторизации» → включить.

Получить публичный URL вида `https://XXXX.containers.yandexcloud.net`.

---

## Часть 2 — Настройка Cloudflare

### 2.1 Добавить домен в Cloudflare

1. Зайти на [cloudflare.com](https://cloudflare.com), добавить сайт `anicontinue.ru`
2. Cloudflare выдаст два NS-сервера (вида `xxx.ns.cloudflare.com`)
3. В **RU-CENTER (nic.ru)**: заменить NS с Vercel (`ns1/ns2.vercel-dns.com`) на Cloudflare NS

### 2.2 DNS-записи в Cloudflare

После делегирования домена в Cloudflare Dashboard → DNS → Records:

| Тип | Имя | Значение | Прокси |
|-----|-----|----------|--------|
| CNAME | www | `XXXX.containers.yandexcloud.net` | ☁️ Proxied |
| CNAME | @ | `www.anicontinue.ru` | ☁️ Proxied |

**Важно**: оба с оранжевым облаком (Proxied) — Cloudflare терминирует TLS и кеширует статику.

### 2.3 SSL/TLS в Cloudflare

SSL/TLS → Overview → выбрать **Full** (Cloudflare ↔ YC Container: YC предоставляет сертификат на `*.containers.yandexcloud.net`, Cloudflare его принимает).

### 2.4 Правила кеширования (Page Rules или Cache Rules)

Кешировать статику Next.js, не кешировать динамику:

**Cache Rules** (новый интерфейс):
- `www.anicontinue.ru/_next/static/*` → Cache Level: Cache Everything, Edge TTL: 1 месяц
- `www.anicontinue.ru/api/*` → Cache Level: Bypass
- `www.anicontinue.ru/*` → Cache Level: Standard

### 2.5 SSE/Streaming — настройка для генерации

Для работы SSE (`/api/generate`) через Cloudflare:
- Cloudflare → Network → **Response Buffering: Off** (уже по умолчанию на Free)
- Cloudflare не буферирует `Content-Type: text/event-stream` ответы

> ⚠️ **Неопределённость**: Serverless Containers YC могут буферировать ответ (лимит 3.5 MB на response).
> Это нужно протестировать на временном URL контейнера (`XXXX.containers.yandexcloud.net`)
> ещё до переключения DNS. Тест: открыть `/api/generate`, смотреть приходит ли поток кусками
> или всё сразу в конце. Если буферируют — UX деградирует (spinner 30 сек → всё сразу),
> но функциональность сохраняется. Исправление в таком случае: убрать streaming из
> `/api/generate`, вернуть обычный JSON-ответ.

---

## Часть 3 — GitHub Secrets

В настройках репозитория GitHub → Settings → Secrets and variables → Actions:

| Secret | Значение |
|--------|----------|
| `YC_SA_JSON` | Содержимое `yc-sa-ci.json` (весь JSON) |
| `YC_FOLDER_ID` | ID папки в YC |
| `YC_REGISTRY_ID` | ID Container Registry |
| `YC_CONTAINER_ID` | ID Serverless Container |
| `YC_SA_RUNNER_ID` | ID service account `anicontinue-runner` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Ключ Anthropic |
| `CRON_SECRET` | Секрет для `/api/cron/aggregate` |

---

## Часть 4 — Supabase

Authentication → URL Configuration:
- **Site URL**: оставить `https://www.anicontinue.ru`
- **Redirect URLs**: убрать `https://*.vercel.app/**`, оставить `https://www.anicontinue.ru/**`

---

## Часть 5 — Мониторинг cold start (keepalive)

YC Serverless Containers масштабируются до нуля при отсутствии запросов. Cold start для Next.js ≈ 3–8 секунд.

**Provisioned instances** (предзапущенные инстансы): доступны, но не входят в free tier —
платишь за RAM × время даже без запросов. При 1 GB = ~500 ₽/мес. Не рекомендуется для бесплатного тарифа.

**Бесплатный keepalive через UptimeRobot:**
1. [uptimerobot.com](https://uptimerobot.com) → Add Monitor → HTTP(S)
2. URL: `https://www.anicontinue.ru/api/settings/public`
3. Interval: 5 minutes
4. Free план: 50 мониторов, 5-минутный интервал — более чем достаточно

Это держит контейнер тёплым 24/7 без дополнительных расходов.

---

## Часть 6 — Rollback на Vercel

1. В RU-CENTER / Cloudflare: изменить DNS-записи обратно
   - NS обратно на `ns1/ns2.vercel-dns.com` (если был Cloudflare)
   - ИЛИ: CNAME `www` → `cname.vercel-dns.com` (если оставляем Cloudflare)
2. В Supabase: вернуть `https://*.vercel.app/**` в Redirect URLs
3. Vercel автоматически обновится с последнего пуша в main (деплой Vercel продолжает работать, пока проект существует)

Время восстановления: 5–30 минут (TTL DNS).

**Поэтому**: не удаляй проект Vercel сразу. Подожди минимум неделю после переезда.

---

## Часть 7 — Стоимость (ориентировочно)

| Ресурс | Free tier | Примерный расход (малый трафик) | Сверх free |
|--------|-----------|-------------------------------|------------|
| Serverless Containers: invocations | 1M/мес | ~50k/мес | — |
| Serverless Containers: RAM×час | 10 GB×h/мес | ~5 GB×h/мес | ₽0.6/GB×h |
| Container Registry: хранение | ~0 (нет явного free) | ~300 MB образ | ₽2/GB/мес ≈ ₽0.6/мес |
| Cloudflare | Unlimited | — | — |

Итого при малом трафике: **0–10 ₽/мес** (только CR хранение).
