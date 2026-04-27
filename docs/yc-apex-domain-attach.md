# Привязка apex-домена `anicontinue.ru` к YC API Gateway

## Проблема

`https://anicontinue.ru` (без `www`) сейчас отдаёт **404** через Cloudflare,
потому что YC API Gateway знает только хост `www.anicontinue.ru`. Все внешние
ссылки на голый домен (Telegram, VK, упоминания в Google Search Console)
ведут в стену.

В коде `next.config.ts` уже добавлен redirect 301:

```ts
{
  source: '/:path*',
  has: [{ type: 'host', value: 'anicontinue.ru' }],
  destination: 'https://www.anicontinue.ru/:path*',
  permanent: true,
}
```

Этот редирект сработает **только если apex-хост попадает в Next.js**.
Сейчас он не попадает — нужно привязать его на стороне YC.

---

## Вариант A — добавить apex как домен у того же API Gateway (рекомендуется)

Чище и без лишних артефактов.

### Шаги

1. **Yandex Cloud Console → API Gateway → выбрать существующий gateway**
   (тот, к которому уже привязан `www.anicontinue.ru`).

2. **Вкладка `Domains` → `Add domain`** → ввести `anicontinue.ru` (без `www`).

3. **Подтверждение владения доменом**.
   YC попросит TXT-запись или CNAME — DNS у нас на Cloudflare:
   - Cloudflare Dashboard → DNS → Records → `Add record`.
   - Тип TXT, name (как в инструкции YC), value (как в инструкции YC).
   - Proxy status → **DNS only** (серый облачко). Если Proxied (оранжевое) —
     YC может не увидеть запись.
   - TTL — Auto.
   - Подождать 1–5 минут, нажать в YC «Проверить».

4. **TLS-сертификат на apex**.
   Нужен сертификат, покрывающий и `anicontinue.ru`, и `www.anicontinue.ru`.
   - Certificate Manager → найти текущий сертификат → проверить SAN-список.
   - Если apex отсутствует → выпустить **новый Let's Encrypt-сертификат**
     с обоими SAN: `anicontinue.ru` + `www.anicontinue.ru`.
   - Подтверждение DNS-челленджем — Let's Encrypt → CM попросит TXT
     `_acme-challenge.anicontinue.ru` → добавить в Cloudflare → готово.
   - В API Gateway → выбрать новый сертификат для apex-домена.

5. **A/AAAA или CNAME запись apex в Cloudflare**.
   YC вернёт IP-адрес или CNAME для gateway → создать в Cloudflare:
   - Тип `A` (или `CNAME` если YC даёт alias) → name `@` → value (как в YC).
   - Proxy status → **DNS only** (серый облачко).
   - TTL — Auto.

6. **Проверить.**
   ```bash
   curl -sI https://anicontinue.ru/ | head -5
   ```
   Ожидаем `HTTP/2 308` (или 301) → `Location: https://www.anicontinue.ru/`.

---

## Вариант B — отдельный Cloud Function `apex-redirect`

Проще с точки зрения сертификатов: не надо переоформлять wildcard,
не задевает основной gateway. Но добавляет одну лишнюю функцию в инфру.

### Шаги

1. **Cloud Functions → Create function**, name `apex-redirect`, runtime
   `nodejs18` (или новее).

2. **Код функции** (JS):
   ```js
   module.exports.handler = async (event) => ({
     statusCode: 301,
     headers: {
       Location: `https://www.anicontinue.ru${event.url || event.path || '/'}`,
     },
   });
   ```

3. **Создать отдельный API Gateway** `apex-redirect-gw`:
   - В спецификации — single `paths: /{proxy+}` → `x-yc-apigateway-integration`
     типа `cloud-functions` → `function_id` = id новой функции.

4. **Привязать домен `anicontinue.ru`** к этому gateway (шаги 2–5 как в
   варианте A, но к новому gateway).

5. **Сертификат на apex** — отдельный Let's Encrypt-сертификат на
   `anicontinue.ru` (single SAN), оформляется в Certificate Manager.

6. **Проверить** (см. шаг 6 варианта A).

---

## Какой вариант выбрать

- **Вариант A** — если не хочешь плодить функции и готов пересобрать
  сертификат под двумя SAN. Минимум сущностей в инфре. **Рекомендую.**
- **Вариант B** — если основной gateway или сертификат менять рискованно
  (например, gateway конфигурирован сложно через YAML и переоформление
  cert ломает старые подписки).

После любого из вариантов apex попадёт в Next.js через основной gateway
(вариант A) или сразу отредиректит (вариант B). Код в `next.config.ts`
гарантирует 301 → www в случае A.

---

## Регрессии после привязки

- Cloudflare Page Rules / редиректы с apex (если были) — отключить, чтобы
  не делать двойной редирект.
- Yandex Webmaster и Google Search Console: подтвердить владение apex
  отдельно, добавить как property → переотправить sitemap.
- Проверить, что `www` ещё работает (`curl -sI https://www.anicontinue.ru/`).
