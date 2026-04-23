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

Воркер принимает только запросы с заголовком
`x-anicontinue-proxy-secret: <PROXY_SECRET>`. Без него возвращает 403.
Это отсекает случайных проходимцев, которые узнают URL, — они не смогут
утилизировать наш бесплатный CF-тир и не будут генерить нагрузку на
наш Anthropic API-ключ.

## Деплой (один раз)

Нужен аккаунт Cloudflare (бесплатный — достаточно).

```powershell
cd cloudflare-worker
npm install
# Войти в свой Cloudflare аккаунт (открывает браузер)
npx wrangler login
# Сгенерить shared secret
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | % {[char]$_})
Write-Output "PROXY_SECRET: $secret"
# Положить secret в Cloudflare (интерактивно вставить значение)
echo $secret | npx wrangler secret put PROXY_SECRET
# Задеплоить
npx wrangler deploy
```

В конце wrangler выведет URL вида:
`https://anicontinue-anthropic-proxy.<твой-subdomain>.workers.dev`

## Настройка YC-контейнера

В **GitHub → Settings → Secrets and variables → Actions** добавить два
новых secret'а:

| Имя | Значение |
|---|---|
| `ANTHROPIC_BASE_URL` | URL воркера из предыдущего шага |
| `ANTHROPIC_PROXY_SECRET` | тот же `$secret` что положили в воркер |

После пуша в `main` workflow `Deploy → YC Serverless Container` сам
подкинет их в env контейнера, новая ревизия поедет с прокси.

## Проверка

```bash
# Без секрета — должен вернуть 403
curl -i https://anicontinue-anthropic-proxy.<subdomain>.workers.dev/v1/messages

# С правильным секретом и Anthropic-ключом — должен вернуть нормальный
# ответ Anthropic (или 401 если ключ битый — главное, не 403 от воркера)
curl -i https://anicontinue-anthropic-proxy.<subdomain>.workers.dev/v1/messages \
  -H "x-anicontinue-proxy-secret: $PROXY_SECRET" \
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
