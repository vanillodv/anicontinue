# anicontinue-anthropic-proxy

Тонкий Cloudflare Worker — прокси к `api.anthropic.com`.

## Зачем

YC Serverless Container живёт в российском IP-пространстве. Anthropic отдаёт
на прямые запросы оттуда:

```
403 {"error":{"type":"forbidden","message":"Request not allowed"}}
```

Cloudflare edge — не в РФ, поэтому запросы проходят. Worker форвардит
запрос как есть (включая streaming SSE), сохраняя все заголовки.

## Безопасность

Воркер сейчас открытый (без shared secret). Практический риск минимален:
URL субдомена случайный, репозиторий приватный, а без валидного
Anthropic API-ключа через прокси всё равно ничего не пройдёт — Anthropic
сам вернёт 401. Если в логах YC/GitHub засветится URL воркера и пойдёт
абуз — добавим обратно shared-secret проверку. Код защиты был раньше,
но синхронизация значения в двух системах (CF + YC) оказалась ненадёжной
(PowerShell clipboard paste искажал байты).

## Деплой (один раз)

Нужен аккаунт Cloudflare (бесплатный — достаточно).

```powershell
cd cloudflare-worker
npm install
# API-токен удобнее OAuth: dash.cloudflare.com/profile/api-tokens → Create Token → Edit Cloudflare Workers
$env:CLOUDFLARE_API_TOKEN = "<твой_cf_api_token>"
npx wrangler deploy
```

В конце wrangler выведет URL вида:
`https://anicontinue-anthropic-proxy.<твой-subdomain>.workers.dev`

## Настройка YC-контейнера

В **GitHub → Settings → Secrets and variables → Actions** добавить один
secret:

| Имя | Значение |
|---|---|
| `ANTHROPIC_BASE_URL` | URL воркера из предыдущего шага |

После пуша в `main` workflow `Deploy → YC Serverless Container` сам
подкинет его в env контейнера, новая ревизия поедет с прокси.

## Проверка

```bash
# С Anthropic-ключом — должен вернуть нормальный ответ Anthropic (или 401
# если ключ битый). Без ключа Anthropic сам ответит 401.
curl -i https://anicontinue-anthropic-proxy.<subdomain>.workers.dev/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

## Лимиты бесплатного CF-тира

- 100 000 запросов в день
- CPU time 10ms на запрос (мы только форвардим — не упрёмся)
- Request size 100MB (Anthropic messages куда меньше)

Для AniContinue этого хватит с запасом.
