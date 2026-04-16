# AniContinue — PROJECT CONTEXT
Обновлено: 16.04.2026

## Проект
Сайт AI-продолжений аниме. Пользователь выбирает аниме из каталога,
нажимает кнопку — получает новую главу от Claude API.
Фича "Вплети себя" — добавить своего персонажа в историю.

## Статус
- Проект создан локально: C:\Users\Vanillodv\anicontinue
- Next.js 16.2.4 запускается на localhost:3000
- Gemini CLI v0.38.1 — исполнитель задач
- Claude — режиссёр и проверяющий

## Стек
- Next.js 16.2.4 + TypeScript + Tailwind CSS 4
- Supabase (локально через CLI)
- Anthropic Claude API (claude-haiku)
- Jikan API v4 (данные об аниме)
- Zustand, Framer Motion, shadcn/ui, lucide-react

## Структура
anicontinue/
├── src/app/          — страницы (App Router)
├── src/components/   — компоненты
├── supabase/         — миграции БД
├── .env.local        — ключи (локально)
└── public/           — статика

## Цвета
--background: #0D0D1A
--surface: #1A1A2E
--primary: #E8409A
--text: #F0F0FF

## Текущий спринт: Спринт 1
Задачи:
[x] Главная страница
[x] Header компонент
[x] Supabase клиент
[x] TypeScript типы

## Правила для Gemini
1. Только TypeScript
2. Стили только через Tailwind
3. Файлы максимум 150 строк
4. Async/await везде
5. Server Components по умолчанию

## Сессии
16.04.2026 — создан проект, запущен localhost:3000