# SEO + Аналитика — что подключить руками

После мерджа PR `feat/seo-and-critical-fixes` следующее требует ручных
действий — добавить env-переменные в YC Cloud Functions / Vercel.
Без них код не упадёт (компоненты no-op'ят), но и SEO-сигналы не будут
работать.

## 1. Yandex.Metrica

1. metrika.yandex.ru → Создать счётчик. Адрес: `https://www.anicontinue.ru`.
   Включить вебвизор, карту кликов, точный показатель отказов.
2. Скопировать ID (число).
3. Установить env:
   ```
   NEXT_PUBLIC_YANDEX_METRICA_ID=12345678
   ```
   Префикс `NEXT_PUBLIC_` — обязательный, потому что счётчик грузится в
   браузере. `<YandexMetrica />` уже подключен в `layout.tsx` и сам
   no-op'ит когда переменной нет.

4. Цели (настроить руками в Метрике):
   - `registration` — JS-событие `ym(ID, "reachGoal", "registration")`
     в `/auth/callback/route.ts` после создания profile
   - `chapter_started` — событие на нажатие «Создать главу» в
     `SceneConstructor.tsx`
   - `chapter_finished` — событие на `done` в стриме `/api/generate`
   - `chapter_published` — на toggle is_public=true

   Эти события надо добавить в коде отдельно — это точки конверсии,
   важные для воронки. Сейчас компонент только подключает счётчик.

## 2. Yandex Webmaster (важно для индексации)

1. webmaster.yandex.ru → Добавить сайт `https://www.anicontinue.ru`.
2. Подтверждение через мета-тег. Скопировать значение `content="..."` из
   `<meta name="yandex-verification" content="...">`.
3. Установить env:
   ```
   YANDEX_VERIFICATION=ваш_токен_из_вебмастера
   ```
   (Без `NEXT_PUBLIC_` — мета-тег рендерится на сервере.)

4. После деплоя нажать «Проверить» в Webmaster.
5. Webmaster → Sitemap → добавить `https://www.anicontinue.ru/sitemap.xml`.
6. Webmaster → Главное зеркало → проверить что www-домен.

После привязки apex-домена (см. `yc-apex-domain-attach.md`) — добавить
`anicontinue.ru` (без www) как **второе подтверждение** и указать в
настройках, что главное зеркало — `www.anicontinue.ru`. Это снимет
дубль контента в индексе.

## 3. Google Search Console

1. search.google.com/search-console → Add property → URL prefix
   `https://www.anicontinue.ru`.
2. Способ верификации: HTML-tag.
3. Скопировать значение `content="..."`.
4. Установить env:
   ```
   GOOGLE_SITE_VERIFICATION=ваш_токен_из_search_console
   ```
5. После деплоя нажать «Verify».
6. Submit sitemap: `sitemap.xml`.

## 4. Mail.Ru Webmaster (опционально)

Поиск Mail.Ru даёт <2% трафика в RU, но раз уж индекс есть — почему нет.
Аналогично: webmaster.mail.ru → Добавить сайт → meta-тег.

```
MAILRU_VERIFICATION=ваш_токен
```

## 5. OG-image PNG (TODO ручкой)

Сейчас `/og-image.svg` — Telegram/VK плохо рендерят SVG-превью при
шаринге ссылок. Нужен `/og-image.png` 1200×630.

Процесс:
1. Открыть `public/og-image.svg` в Figma/Inkscape, экспортировать PNG.
2. Положить в `public/og-image.png`.
3. В `layout.tsx`, `catalog/page.tsx`, `community/page.tsx` поменять
   путь `/og-image.svg` → `/og-image.png`.

Можно отложить — для аниме- и chapter-страниц og-image — постер,
там SVG не используется.

## 6. Проверка после деплоя

```bash
# Schema.org валидность
curl -s https://www.anicontinue.ru/ | grep -A 100 'application/ld+json'

# Sitemap живой
curl -sI https://www.anicontinue.ru/sitemap.xml | head -3

# Apex редиректит (после привязки домена в YC)
curl -sI https://anicontinue.ru/ | head -5

# Cache-Control работает
curl -sI https://www.anicontinue.ru/catalog | grep -i cache
```

Внешние валидаторы:
- search.google.com/test/rich-results — проверка JSON-LD
- developers.facebook.com/tools/debug — проверка og:image для Telegram/FB
- cards-dev.twitter.com/validator — Twitter Card

## Влияние на трафик (прогноз)

**2 недели:** apex-редирект подбирает back-links, JSON-LD начинает
парситься, Метрика и Webmaster показывают первые сессии.
Ожидание — рост в Яндекс на 15-25%.

**4 недели:** хлебные крошки + breadcrumb-разметка → Google показывает
их в SERP вместо длинного URL → выше CTR. Похожие тайтлы → больше
страниц в индексе и больше переходов между ними. Ожидание — рост
индексируемых страниц с ~310 до ~500 в Google Search Console.

**6+ недель:** ItemList на главной → возможно появление аниме-карусели
в SERP (зависит от качества контента). Article на /chapter/[id] +
inLanguage ru-RU → главы начинают подниматься на запросы вида
«фанфик [название]».
