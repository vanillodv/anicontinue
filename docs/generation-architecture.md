# Архитектура генерации глав — AniContinue

Дата: 2026-04-24  
Ветка: `fix/generation-quality`

---

## Флоу запроса end-to-end

```
[Пользователь]
  → Открывает страницу аниме
  → Нажимает "Создать главу" / "Продолжить историю"
  → Заполняет SceneConstructor (mood, sceneType, startingPoint, endingContext, customCharacters)
  → POST /api/generate

[/api/generate — route.ts (Node.js, maxDuration=60s)]
  1. Auth check (createClient + supabase.auth.getUser) → 401 если нет сессии
  2. Zod-валидация тела запроса → 400 если невалидно
  3. Rate-limit: check_rate_limit RPC × 2 (5/мин user, 10/мин IP)
  4. consume_chapter RPC — атомарно: бан + лимит + инкремент
  5. shouldLoadContext = sceneType ∈ {continuation, alternative, own-ending}
  6. Параллельно:
     а. SELECT anime WHERE id = ?
     б. loadStoryContext(userId, animeId) если shouldLoadContext:
        - story_bibles (summary, plot_arc, world_state)
        - story_characters (активные)
        - story_events (importance ≥ 7, top-10)
        - chapters (последние 5, DESC): title, summary, content, scene_params
  7. SELECT ai_prompts WHERE is_active=true (через svc(), обходит RLS)
  8. buildPrompt(anime, params, storyCtx) → system + user message
  9. streamWithRetry(anthropic.messages.stream, {model, max_tokens:3500, temp:0.85})
     Retry: до 3 попыток, backoff 1s→3s→9s, не повторяет 4xx
  10. SSE-стриминг XML: <title>, <content>, <summary> → клиент
  11. INSERT chapters (с scene_params = все поля формы + allCustomChars)
  12. INSERT ai_usage_logs (через svc() — обходит RLS)
  13. SSE: {type:'done', chapterId}
  14. Фоновое updateStoryBibleAsync (не блокирует ответ):
      → Claude Haiku обновляет story_bibles, story_events, story_characters
```

---

## Многослойная память (Story Bible)

Ключевой инвариант: **контекст < 40k токенов при любом N (1, 2, 5, 30, 100, 200+ глав).**

### Слои контекста (в порядке добавления в промпт)

| Слой | Источник | Размер | Инвариант |
|------|----------|--------|-----------|
| Резюме истории | `story_bibles.summary` | ≤ 600 слов | Сжатое Claude'ом |
| Состояние мира | `story_bibles.world_state` | ≤ 3 предл. | Сжатое |
| Главная арка | `story_bibles.plot_arc` | ≤ 3 предл. | Сжатое |
| Постоянные персонажи | `story_characters` | N персонажей | Только `status=active` |
| Ключевые события | `story_events` | Top-10, importance≥7 | Ограничено 10 |
| Summary 4 прошлых глав | `chapters.summary` | ≤ 4 × 1 предл. | Из fetchLimit=5, кроме последней |
| Полный текст последней главы | `chapters.content` | ≤ 2500 токенов | `truncateToTokens(text, 2500)` |

**Итог при N=100**: ≈8000-12000 токенов для контекста + ≈3000 токенов для базового промпта = **≈11000-15000 токенов** — вдвое меньше лимита 40k.

### Фоновое обновление Bible

Запускается после успешного сохранения главы (fire-and-forget, не блокирует ответ):

```
updateStoryBibleAsync(userId, animeId, chapterId, title, content, summary, customChars)
  → Claude Haiku (max_tokens=1200, temperature=0.3)
  → JSON: { summary, plot_arc, world_state, events[], character_updates[] }
  → UPSERT story_bibles
  → INSERT story_events (до 5 новых событий)
  → UPSERT story_characters (из customCharacters + обновление статусов)
```

**Первая глава (N=1):** bible пустой, фоновый вызов инициализирует его из одной главы.  
**Последующие:** bible обновляется инкрементально — не нужно перечитывать все главы.

---

## Типы сцен (sceneType)

| Тип | Загружает контекст? | Инструкция Claude |
|-----|--------------------|--------------------|
| `continuation` | ✅ | "Строго продолжай сюжетную линию предыдущих глав" |
| `alternative` | ✅ | "Разверни события в другом направлении, не следуй канону" |
| `own-ending` | ✅ | "Веди историю к финалу из поля startingPoint" |
| `undefined`/`new` | ❌ | "Начни новую историю в этом мире" |

**Исправлено:** ранее `sceneType` и `continuePrevious` были независимы — теперь только `sceneType` определяет загрузку контекста.

---

## Персонажи

Персонажи из формы текущей генерации **объединяются** с `recurringCharacters` из `scene_params` последних 5 глав:

```
allCustomChars = dedupeByName([...recurringCharacters, ...params.customCharacters])
// Новые из формы перезаписывают recurring по имени (case-insensitive)
```

Все персонажи из `allCustomChars` записываются в `scene_params` главы (JSONB).  
После генерации — `UPSERT story_characters` для каждого.

---

## Ошибки генерации

| Сценарий | HTTP | error code | Клиент |
|----------|------|------------|--------|
| Нет сессии | 401 | `UNAUTHORIZED` | CTA "Войти" |
| Невалидные поля | 400 | `INVALID_INPUT` | Inline-ошибка |
| Rate limit | 429 | `RATE_LIMITED` | "Подождите минуту" |
| Бан | 403 | `BANNED` | "Аккаунт заблокирован" |
| Лимит глав | 403 | `LIMIT_REACHED` | CTA Boosty |
| Аниме не найдено | 404 | `ANIME_NOT_FOUND` | "Обновите страницу" |
| DB ошибка | 500 | `DB_ERROR` | "Попробуйте снова" |
| Ошибка AI | 500 | `GENERATION_FAILED` | "Попробуйте снова" |

Все ошибки пишутся в `generation_errors` (user_id, anime_id, error_type, error_message).

---

## AI-промпт (сборка)

```
[baseSystemPrompt от v3.0-multi-fewshot из ai_prompts WHERE is_active=true]
  Читается через svc() — обходит RLS, которая блокирует обычных пользователей.
  Fallback: "Ты автор фанфика. Пиши ТОЛЬКО на русском."

+ XML format instruction

+ getMasterSystemPrompt(anime, endingContext, startingPoint, storyContextBlock, customChars):
  - ДОСЬЕ НА АНИМЕ (title, year, studio, genres, episodes, synopsis, characters)
  - КУРИРОВАННЫЕ ЗНАНИЯ (anime.prompt_template для топ-10)
  - КОНТЕКСТ ДЛЯ ГЛАВЫ (endingBlock / worldContext + startingBlock)
  - ИСТОРИЯ ПОЛЬЗОВАТЕЛЯ (storyContextBlock — многослойный, см. выше)
  - ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА

User message: "Напиши главу. Настроение: {mood}. {typeNote}"
```

---

## Миграции (применять в Supabase SQL Editor)

| Миграция | Статус | Содержание |
|----------|--------|-----------|
| 022 | Не применена | INSERT-политика на ai_usage_logs |
| 023 | Не применена | story_bibles, story_characters, story_events + RLS |

---

## Admin endpoints

| Endpoint | Метод | Назначение |
|----------|-------|-----------|
| `/api/admin/rebuild-bible?user_id=...&anime_id=...` | POST | Пересобрать Story Bible из всех существующих глав |

---

## Тесты

```bash
npm test   # 30 тестов, vitest run
```

Тесты в `tests/generation.test.ts`:
- Unit: `truncateToTokens`, `dedupeByName`, `buildContextBlock`, `getTypeNote`
- Integration: размер контекста при N=1,2,5,30,100 (инвариант < 40k токенов)
- Integration: `sceneType` → `shouldLoadContext` логика
- Regression: нет противоречия в промпте `alternative`
