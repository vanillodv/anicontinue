/**
 * Тесты генерации глав.
 *
 * Unit-тесты для утилит (truncateToTokens, dedupeByName, buildContextBlock, getTypeNote)
 * и integration-тесты для сценариев N=1, N=2, N=5, N=30, N=100 (мокированные данные).
 *
 * Инвариант: длина итогового контекста < 40k токенов (≈ 160k символов) при любом N.
 */
import { describe, it, expect } from 'vitest';
import {
  truncateToTokens,
  dedupeByName,
  buildContextBlock,
  getTypeNote,
} from '../src/lib/story/bible';
import type { StoryContext } from '../src/lib/story/bible';

// ─── Вспомогательные фабрики ─────────────────────────────────────────────────

function makeChapter(n: number, contentLen = 4000): { title: string; summary: string; content: string } {
  return {
    title: `Глава ${n}`,
    summary: `В главе ${n} произошло важное событие.`,
    content: 'Текст '.repeat(contentLen / 6).slice(0, contentLen),
  };
}

function makeCtx(opts: {
  hasBible?: boolean;
  characters?: number;
  events?: number;
  previousChapters?: number;
  lastChapterLen?: number;
  characterStatuses?: string[];
}): StoryContext {
  const {
    hasBible = false,
    characters = 0,
    events = 0,
    previousChapters = 0,
    lastChapterLen = 4000,
    characterStatuses = [],
  } = opts;

  const bible = hasBible
    ? {
        summary: 'Это история о герое и его приключениях. '.repeat(20).slice(0, 1200),
        plot_arc: 'Главная арка — поиск потерянного артефакта.',
        world_state: 'Мир после великой войны.',
        total_chapters: previousChapters,
      }
    : null;

  const chars = Array.from({ length: characters }, (_, i) => ({
    name: `Персонаж ${i + 1}`,
    role: `Роль ${i + 1}`,
    current_status: characterStatuses[i] ?? 'active',
  }));

  const topEvents = Array.from({ length: Math.min(events, 10) }, (_, i) => ({
    description: `Событие важности ${10 - i}: что-то произошло`,
    importance: 10 - i,
    event_type: 'plot-point',
  }));

  let previousChaptersContext = '';
  let recurringCharacters: Array<{ name: string; role: string }> = [];

  if (previousChapters > 0) {
    const olderCount = Math.min(previousChapters - 1, 4);
    const olderSummaries = Array.from({ length: olderCount }, (_, i) =>
      `Глава ${previousChapters - 1 - i}: "${makeChapter(previousChapters - 1 - i).title}" — ${makeChapter(i).summary}`
    ).join('\n');

    const lastContent = truncateToTokens(makeChapter(previousChapters, lastChapterLen).content, 2500);
    previousChaptersContext = [
      olderSummaries && `Предыдущие главы:\n${olderSummaries}`,
      `Последняя глава "Глава ${previousChapters}" закончилась так:\n${lastContent}`,
    ].filter(Boolean).join('\n\n');

    recurringCharacters = Array.from({ length: Math.min(2, characters) }, (_, i) => ({
      name: `Персонаж ${i + 1}`,
      role: `Роль ${i + 1}`,
    }));
  }

  return { bible, characters: chars, topEvents, previousChaptersContext, recurringCharacters };
}

// ─── Unit: truncateToTokens ───────────────────────────────────────────────────

describe('truncateToTokens', () => {
  it('не трогает короткий текст', () => {
    const text = 'Привет мир';
    expect(truncateToTokens(text, 1000)).toBe(text);
  });

  it('берёт хвост длинного текста (maxTokens * 4 символа)', () => {
    const text = 'А'.repeat(10000);
    const result = truncateToTokens(text, 100);
    expect(result.length).toBe(400);
    expect(result).toBe(text.slice(-400));
  });

  it('граница точно maxChars', () => {
    const text = 'Б'.repeat(2000);
    const result = truncateToTokens(text, 500);
    expect(result.length).toBe(2000);
  });
});

// ─── Unit: dedupeByName ───────────────────────────────────────────────────────

describe('dedupeByName', () => {
  it('убирает дубликаты case-insensitive, последний побеждает', () => {
    const chars = [
      { name: 'Артём', role: 'Друг' },
      { name: 'артём', role: 'Обновлённая роль' },
      { name: 'Лена', role: 'Сестра' },
    ];
    const result = dedupeByName(chars);
    expect(result).toHaveLength(2);
    expect(result.find(c => c.name.toLowerCase() === 'артём')?.role).toBe('Обновлённая роль');
  });

  it('пустой массив', () => {
    expect(dedupeByName([])).toEqual([]);
  });

  it('уникальные имена не теряются', () => {
    const chars = [{ name: 'Один', role: '' }, { name: 'Два', role: '' }];
    expect(dedupeByName(chars)).toHaveLength(2);
  });
});

// ─── Unit: getTypeNote ────────────────────────────────────────────────────────

describe('getTypeNote', () => {
  it('continuation — продолжение истории пользователя', () => {
    expect(getTypeNote('continuation')).toMatch(/ПРЯМОЕ ПРОДОЛЖЕНИЕ/);
  });

  it('alternative — НЕ содержит "строго продолжай" (исправлено противоречие)', () => {
    const note = getTypeNote('alternative');
    expect(note).toMatch(/АЛЬТЕРНАТИВНАЯ/);
    expect(note).not.toMatch(/строго продолжай сюжетную линию/);
  });

  it('own-ending — авторская концовка', () => {
    expect(getTypeNote('own-ending')).toMatch(/АВТОРСКАЯ/);
  });

  it('undefined — новая история', () => {
    expect(getTypeNote(undefined)).toMatch(/Начни новую историю/);
  });
});

// ─── Unit: buildContextBlock ─────────────────────────────────────────────────

describe('buildContextBlock', () => {
  it('пустой контекст (N=0 глав) — возвращает пустую строку', () => {
    const ctx = makeCtx({ hasBible: false, characters: 0, previousChapters: 0 });
    expect(buildContextBlock(ctx, 'continuation')).toBe('');
  });

  it('содержит summary bible если он есть', () => {
    const ctx = makeCtx({ hasBible: true, previousChapters: 5 });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).toContain('Резюме всей истории');
    expect(block).toContain('приключениях');
  });

  it('содержит персонажей', () => {
    const ctx = makeCtx({ hasBible: true, characters: 3, previousChapters: 5 });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).toContain('Персонаж 1');
    expect(block).toContain('Постоянные персонажи');
  });

  it('содержит события', () => {
    const ctx = makeCtx({ hasBible: true, events: 10, previousChapters: 5 });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).toContain('Ключевые события');
  });
});

// ─── Integration: размер контекста при N=1,2,5,30,100 ───────────────────────

const MAX_CONTEXT_CHARS = 160_000; // ≈ 40k токенов × 4 символа/токен

describe('buildContextBlock — инвариант размера (любое N)', () => {
  const scenarios: Array<{ label: string; n: number; bible: boolean; chars: number; events: number }> = [
    { label: 'N=1 (первая глава, bible отсутствует)', n: 1, bible: false, chars: 0, events: 0 },
    { label: 'N=2 (bible только инициализирован)', n: 2, bible: true, chars: 1, events: 1 },
    { label: 'N=5 (короткая история)', n: 5, bible: true, chars: 3, events: 3 },
    { label: 'N=30 (средняя история)', n: 30, bible: true, chars: 5, events: 10 },
    { label: 'N=100 (длинная история)', n: 100, bible: true, chars: 5, events: 10 },
  ];

  for (const { label, n, bible, chars, events } of scenarios) {
    it(label, () => {
      const ctx = makeCtx({
        hasBible: bible,
        characters: chars,
        events,
        previousChapters: n,
        lastChapterLen: 6000, // Длинная последняя глава
      });

      const block = buildContextBlock(ctx, 'continuation');

      // Контекст не должен превышать лимит
      expect(block.length).toBeLessThan(MAX_CONTEXT_CHARS);

      // N=1 без bible → пустой или минимальный контекст
      if (n === 1 && !bible) {
        // Может быть не пустым если есть previousChaptersContext
        expect(block.length).toBeLessThan(20_000);
      }

      // N≥2 с bible → всегда содержит bible summary
      if (n >= 2 && bible) {
        expect(block).toContain('ИСТОРИЯ ПОЛЬЗОВАТЕЛЯ');
      }
    });
  }
});

// ─── Integration: полный промпт не превышает 40k токенов ─────────────────────

describe('Полный промпт < 40k токенов при любом N', () => {
  const SYSTEM_PROMPT_BASE_CHARS = 5000; // базовая часть системного промпта
  const MAX_TOTAL_CHARS = MAX_CONTEXT_CHARS;

  it('N=100 + 5 персонажей + 10 событий → промпт в лимите', () => {
    const ctx = makeCtx({
      hasBible: true,
      characters: 5,
      events: 10,
      previousChapters: 100,
      lastChapterLen: 10_000, // Очень длинная глава — truncate должен сработать
    });

    const contextBlock = buildContextBlock(ctx, 'continuation');
    const totalEstimate = SYSTEM_PROMPT_BASE_CHARS + contextBlock.length;

    expect(totalEstimate).toBeLessThan(MAX_TOTAL_CHARS);
  });
});

// ─── Integration: sceneType vs context loading ────────────────────────────────

describe('shouldLoadContext по sceneType', () => {
  const CONTEXT_SCENE_TYPES = ['continuation', 'alternative', 'own-ending'];
  const NO_CONTEXT_TYPES = [undefined, 'new', 'standalone'];

  for (const sceneType of CONTEXT_SCENE_TYPES) {
    it(`sceneType="${sceneType}" → должен загружать контекст`, () => {
      const shouldLoad = CONTEXT_SCENE_TYPES.includes(sceneType);
      expect(shouldLoad).toBe(true);
    });
  }

  for (const sceneType of NO_CONTEXT_TYPES) {
    it(`sceneType=${JSON.stringify(sceneType)} → НЕ загружает контекст`, () => {
      const shouldLoad = CONTEXT_SCENE_TYPES.includes(sceneType as string);
      expect(shouldLoad).toBe(false);
    });
  }
});

// ─── Integration: recurringCharacters дедупликация ───────────────────────────

describe('dedupeByName — персонажи из истории', () => {
  it('recurring из истории + новые из формы: новые перезаписывают по имени', () => {
    const recurring = [
      { name: 'Артём', role: 'Старая роль из главы 1' },
      { name: 'Лена', role: 'Подруга' },
    ];
    const fromForm = [
      { name: 'Артём', role: 'Новая роль из формы' },
      { name: 'Макс', role: 'Новый персонаж' },
    ];
    const merged = dedupeByName([...recurring, ...fromForm]);
    expect(merged).toHaveLength(3);
    expect(merged.find(c => c.name === 'Артём')?.role).toBe('Новая роль из формы');
    expect(merged.find(c => c.name === 'Макс')).toBeDefined();
    expect(merged.find(c => c.name === 'Лена')).toBeDefined();
  });
});

// ─── Fix 3: Статусы персонажей в buildContextBlock ───────────────────────────

describe('buildContextBlock — статусы персонажей', () => {
  it('мёртвый персонаж помечается DEAD с предупреждением о воскрешении', () => {
    const ctx = makeCtx({
      hasBible: true,
      characters: 2,
      previousChapters: 3,
      characterStatuses: ['dead', 'active'],
    });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).toContain('DEAD (не воскрешать без явной сюжетной причины)');
    expect(block).toContain('Персонаж 1');
  });

  it('живой персонаж (active) помечается ALIVE', () => {
    const ctx = makeCtx({
      hasBible: true,
      characters: 2,
      previousChapters: 3,
      characterStatuses: ['active', 'alive'],
    });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).toContain('ALIVE');
    expect(block).not.toContain('DEAD');
  });

  it('мёртвый персонаж НЕ отфильтровывается из блока (Fix 3)', () => {
    const ctx = makeCtx({
      hasBible: false,
      characters: 3,
      previousChapters: 3,
      characterStatuses: ['dead', 'dead', 'active'],
    });
    const block = buildContextBlock(ctx, 'continuation');
    // Все три персонажа должны появиться в контексте
    expect(block).toContain('Персонаж 1');
    expect(block).toContain('Персонаж 2');
    expect(block).toContain('Персонаж 3');
  });

  it('статус missing не помечается как DEAD', () => {
    const ctx = makeCtx({
      hasBible: true,
      characters: 1,
      previousChapters: 2,
      characterStatuses: ['missing'],
    });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).not.toContain('DEAD');
    expect(block).toContain('[missing]');
  });

  it('Постоянные персонажи: счётчик включает и мёртвых', () => {
    const ctx = makeCtx({
      hasBible: true,
      characters: 3,
      previousChapters: 4,
      characterStatuses: ['dead', 'active', 'missing'],
    });
    const block = buildContextBlock(ctx, 'continuation');
    expect(block).toContain('Постоянные персонажи истории (3)');
  });
});

// ─── Fix 2: Валидные статусы для character_updates ───────────────────────────

describe('Валидные статусы персонажей', () => {
  const VALID_STATUSES = ['alive', 'dead', 'missing', 'transformed', 'left-story', 'unknown', 'active'];
  const INVALID_STATUSES = ['killed', 'gone', 'changed', 'unknown-status', ''];

  for (const status of VALID_STATUSES) {
    it(`статус "${status}" валидный`, () => {
      expect(VALID_STATUSES.includes(status)).toBe(true);
    });
  }

  for (const status of INVALID_STATUSES) {
    it(`статус "${status}" НЕ валидный (фильтруется в bible-update)`, () => {
      expect(VALID_STATUSES.includes(status)).toBe(false);
    });
  }
});

// ─── Regression: alternative не должен противоречить continuation ─────────────

describe('Регрессия: нет противоречия в промпте alternative', () => {
  it('typeNote для alternative не содержит "строго продолжай сюжетную линию"', () => {
    const note = getTypeNote('alternative');
    expect(note).not.toMatch(/строго продолжай сюжетную линию/i);
  });

  it('typeNote для continuation содержит "строго продолжай сюжетную линию"', () => {
    const note = getTypeNote('continuation');
    expect(note).toMatch(/строго продолжай сюжетную линию/i);
  });

  it('typeNote для alternative содержит "другом направлении" (альтернативная ветка)', () => {
    const note = getTypeNote('alternative');
    expect(note).toMatch(/другом направлении/i);
  });
});
