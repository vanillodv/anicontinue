import { createClient as createSvcClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { CustomCharacter } from '@/lib/validate';

// Утилита: брать хвост строки не длиннее maxChars символов (приближение к токенам).
// 1 токен ≈ 4 кириллических символа / 1 английское слово.
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(-maxChars);
}

// Дедуп персонажей по имени (case-insensitive). Последний встреченный побеждает.
export function dedupeByName(chars: CustomCharacter[]): CustomCharacter[] {
  const map = new Map<string, CustomCharacter>();
  for (const c of chars) {
    map.set(c.name.toLowerCase(), c);
  }
  return Array.from(map.values());
}

function svc() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface StoryBible {
  summary: string | null;
  plot_arc: string | null;
  world_state: string | null;
  total_chapters: number;
}

export interface StoryCharacter {
  name: string;
  role: string | null;
  current_status: string;
}

export interface StoryEvent {
  description: string;
  importance: number;
  event_type: string | null;
}

export interface StoryContext {
  bible: StoryBible | null;
  characters: StoryCharacter[];
  topEvents: StoryEvent[];
  previousChaptersContext: string;
  recurringCharacters: CustomCharacter[];
}

// Загружает многослойный контекст для генерации новой главы.
// Для N>5 глав: bible+characters+events дают «память» начала, последние 5 — свежий контекст.
export async function loadStoryContext(
  userId: string,
  animeId: number,
  sceneType: string,
): Promise<StoryContext> {
  const db = svc();

  const [bibleResult, charsResult, eventsResult, prevResult] = await Promise.all([
    db.from('story_bibles')
      .select('summary, plot_arc, world_state, total_chapters')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .maybeSingle(),

    db.from('story_characters')
      .select('name, role, current_status')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .eq('current_status', 'active')
      .order('created_at', { ascending: true }),

    db.from('story_events')
      .select('description, importance, event_type')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .gte('importance', 7)
      .order('importance', { ascending: false })
      .limit(10),

    db.from('chapters')
      .select('title, summary, content, scene_params, created_at')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const bible = bibleResult.data ?? null;
  const characters = charsResult.data ?? [];
  const topEvents = eventsResult.data ?? [];
  const prevChapters = prevResult.data ?? [];

  // Собираем строку предыдущего контекста (с полным текстом последней главы)
  let previousChaptersContext = '';
  let recurringCharacters: CustomCharacter[] = [];

  if (prevChapters.length > 0) {
    const [lastChapter, ...olderChapters] = prevChapters;

    const lastContent = truncateToTokens(lastChapter.content ?? '', 2500);

    const olderSummaries = olderChapters
      .map((ch, i) => `Глава ${olderChapters.length - i}: "${ch.title}" — ${ch.summary ?? 'нет сводки'}`)
      .join('\n');

    previousChaptersContext = [
      olderSummaries && `Предыдущие главы:\n${olderSummaries}`,
      `Последняя глава "${lastChapter.title}" закончилась так:\n${lastContent}`,
    ].filter(Boolean).join('\n\n');

    // Собираем персонажей из scene_params всех прошлых глав
    const allChars: CustomCharacter[] = [];
    for (const ch of prevChapters) {
      const params = ch.scene_params as any;
      if (Array.isArray(params?.customCharacters)) {
        allChars.push(...params.customCharacters);
      }
    }
    recurringCharacters = dedupeByName(allChars);
  }

  return { bible, characters, topEvents, previousChaptersContext, recurringCharacters };
}

// Строит многослойный блок контекста для промпта Claude.
export function buildContextBlock(ctx: StoryContext, sceneType: string): string {
  const parts: string[] = [];

  if (ctx.bible?.summary) {
    parts.push(`### Резюме всей истории\n${ctx.bible.summary}`);
  }

  if (ctx.bible?.world_state) {
    parts.push(`### Текущее состояние мира\n${ctx.bible.world_state}`);
  }

  if (ctx.bible?.plot_arc) {
    parts.push(`### Главная сюжетная арка\n${ctx.bible.plot_arc}`);
  }

  if (ctx.characters.length > 0) {
    const lines = ctx.characters.map(c =>
      `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.current_status !== 'active' ? ` [${c.current_status}]` : ''}`
    );
    parts.push(`### Постоянные персонажи истории (${ctx.characters.length})\n${lines.join('\n')}`);
  }

  if (ctx.topEvents.length > 0) {
    const lines = ctx.topEvents.map(e => `- ${e.description}`);
    parts.push(`### Ключевые события\n${lines.join('\n')}`);
  }

  if (ctx.previousChaptersContext) {
    parts.push(`### Предыдущий контекст\n${ctx.previousChaptersContext}`);
  }

  if (parts.length === 0) return '';

  return `═══════════════════════════════
ИСТОРИЯ ПОЛЬЗОВАТЕЛЯ (сохраняй преемственность)
═══════════════════════════════
${parts.join('\n\n')}`;
}

// Строит typeNote в зависимости от sceneType (без противоречий).
export function getTypeNote(sceneType: string | undefined): string {
  switch (sceneType) {
    case 'continuation':
      return 'Это ПРЯМОЕ ПРОДОЛЖЕНИЕ — строго продолжай сюжетную линию предыдущих глав пользователя. Персонажи помнят всё произошедшее.';
    case 'alternative':
      return 'Это АЛЬТЕРНАТИВНАЯ ВЕТКА — возьми последнюю главу за точку отправления, но разверни события в другом направлении, не следуй канону дальше. Используй персонажей и мир из предыдущих глав.';
    case 'own-ending':
      return 'Это АВТОРСКАЯ КОНЦОВКА — веди историю к финалу, который описан в поле «Своя точка отправления». Заверши арку органично.';
    default:
      return 'Начни новую историю в этом аниме-мире, не опираясь на предыдущие главы.';
  }
}

// Обновляет Story Bible в фоне после успешной генерации главы.
// Не бросает исключений — все ошибки логируются и проглатываются.
export async function updateStoryBibleAsync(
  userId: string,
  animeId: number,
  chapterId: string,
  chapterTitle: string,
  chapterContent: string,
  chapterSummary: string,
  customCharacters: CustomCharacter[],
): Promise<void> {
  try {
    const db = svc();

    // Получаем текущий bible
    const { data: existing } = await db
      .from('story_bibles')
      .select('*')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .maybeSingle();

    const totalChapters = (existing?.total_chapters ?? 0) + 1;

    // Краткий Claude-вызов для обновления bible (не стрим, обычный request)
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    });

    const systemMsg = `Ты — хранитель сводки фанфика. Обновляй данные ТОЛЬКО на основе новой главы. Отвечай СТРОГО в JSON без markdown-оберток.`;

    const currentBible = existing
      ? JSON.stringify({
          summary: existing.summary ?? '',
          plot_arc: existing.plot_arc ?? '',
          world_state: existing.world_state ?? '',
        })
      : JSON.stringify({ summary: '', plot_arc: '', world_state: '' });

    const userMsg = `Текущая сводка истории:
${currentBible}

Новая глава (${totalChapters}): "${chapterTitle}"
Краткое содержание: ${chapterSummary}
Начало текста: ${chapterContent.slice(0, 800)}

Верни JSON:
{
  "summary": "<обновлённая сводка всей истории, 200-600 слов>",
  "plot_arc": "<главная нерешённая арка после этой главы, 1-3 предложения>",
  "world_state": "<состояние мира после этой главы, 1-3 предложения>",
  "events": [{"description": "...", "importance": 1-10, "event_type": "plot-point|death|meeting|conflict|resolution|revelation|other"}],
  "character_updates": [{"name": "...", "current_status": "active|dead|missing|changed"}]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      temperature: 0.3,
      system: systemMsg,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed: any = {};
    try {
      // Вырезаем JSON если он обёрнут в markdown
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      // Если Claude вернул невалидный JSON — частичное обновление
    }

    // Upsert bible
    await db.from('story_bibles').upsert({
      user_id: userId,
      anime_id: animeId,
      summary: parsed.summary || existing?.summary || chapterSummary,
      plot_arc: parsed.plot_arc || existing?.plot_arc || null,
      world_state: parsed.world_state || existing?.world_state || null,
      total_chapters: totalChapters,
      updated_at_chapter_id: chapterId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,anime_id' });

    // Добавляем события
    if (Array.isArray(parsed.events) && parsed.events.length > 0) {
      const events = parsed.events
        .filter((e: any) => e?.description)
        .slice(0, 5)
        .map((e: any) => ({
          user_id: userId,
          anime_id: animeId,
          chapter_id: chapterId,
          event_type: e.event_type || 'plot-point',
          description: String(e.description).slice(0, 500),
          importance: Number(e.importance) || 5,
        }));
      if (events.length > 0) {
        await db.from('story_events').insert(events);
      }
    }

    // Upsert персонажей из customCharacters текущей главы
    for (const char of customCharacters) {
      if (!char.name) continue;
      await db.from('story_characters').upsert({
        user_id: userId,
        anime_id: animeId,
        name: char.name,
        role: char.role || null,
        current_status: 'active',
        last_chapter_id: chapterId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,anime_id,name' });
    }

    // Обновляем статусы из bible response
    if (Array.isArray(parsed.character_updates)) {
      for (const upd of parsed.character_updates) {
        if (!upd?.name) continue;
        await db.from('story_characters')
          .update({ current_status: upd.current_status || 'active', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('anime_id', animeId)
          .ilike('name', upd.name);
      }
    }

  } catch (err) {
    // Фоновое обновление не должно влиять на основной флоу
    console.error('[story-bible] background update failed:', err);
  }
}

// Пересборка bible из всех существующих глав (для admin rebuild endpoint).
export async function rebuildStoryBible(
  userId: string,
  animeId: number,
): Promise<{ ok: boolean; message: string }> {
  try {
    const db = svc();
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    });

    const { data: chapters } = await db
      .from('chapters')
      .select('id, title, summary, content, scene_params, created_at')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (!chapters || chapters.length === 0) {
      return { ok: false, message: 'Нет глав для пересборки' };
    }

    const summaries = chapters
      .map((ch, i) => `Глава ${i + 1}: "${ch.title}" — ${ch.summary ?? 'нет сводки'}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.3,
      system: 'Ты — хранитель сводки фанфика. Отвечай СТРОГО в JSON без markdown-оберток.',
      messages: [{
        role: 'user',
        content: `Вот все главы пользовательской истории (${chapters.length} штук):\n${summaries}\n\nВерни JSON:\n{"summary":"<полная сводка всей истории, 300-800 слов>","plot_arc":"<главная нерешённая арка>","world_state":"<текущее состояние мира>"}`,
      }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed: any = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch { /* частичное восстановление */ }

    await db.from('story_bibles').upsert({
      user_id: userId,
      anime_id: animeId,
      summary: parsed.summary || summaries,
      plot_arc: parsed.plot_arc || null,
      world_state: parsed.world_state || null,
      total_chapters: chapters.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,anime_id' });

    // Пересобираем персонажей из scene_params
    const allChars: Array<{ name: string; role: string | null; chapterId: string }> = [];
    for (const ch of chapters) {
      const params = ch.scene_params as any;
      if (Array.isArray(params?.customCharacters)) {
        for (const c of params.customCharacters) {
          if (c?.name) allChars.push({ name: c.name, role: c.role ?? null, chapterId: ch.id });
        }
      }
    }

    // Удаляем старых и вставляем заново
    await db.from('story_characters').delete().eq('user_id', userId).eq('anime_id', animeId);
    const deduped = dedupeByName(allChars.map(c => ({ name: c.name, role: c.role ?? '' })));
    if (deduped.length > 0) {
      await db.from('story_characters').insert(
        deduped.map(c => ({
          user_id: userId,
          anime_id: animeId,
          name: c.name,
          role: c.role || null,
          current_status: 'active',
        }))
      );
    }

    return { ok: true, message: `Bible пересобран из ${chapters.length} глав, ${deduped.length} персонажей` };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? String(err) };
  }
}
