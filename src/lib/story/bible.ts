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

    // Fix 3: загружаем ВСЕХ персонажей (включая мёртвых), чтобы Claude знал кого не воскрешать
    db.from('story_characters')
      .select('name, role, current_status')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
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
    // Fix 3: показываем ВСЕХ персонажей с их статусами; мёртвых — с явным запретом воскрешения
    const DEAD_STATUSES = new Set(['dead', 'death']);
    const activeChars = ctx.characters.filter(c => !DEAD_STATUSES.has(c.current_status));
    const deadChars = ctx.characters.filter(c => DEAD_STATUSES.has(c.current_status));

    const lines: string[] = [];
    for (const c of activeChars) {
      const statusTag = (c.current_status && c.current_status !== 'active' && c.current_status !== 'alive')
        ? ` [${c.current_status}]`
        : '';
      lines.push(`- ${c.name}${c.role ? ` (${c.role})` : ''}${statusTag} — ALIVE`);
    }
    for (const c of deadChars) {
      lines.push(`- ${c.name}${c.role ? ` (${c.role})` : ''} — DEAD (не воскрешать без явной сюжетной причины)`);
    }

    if (lines.length > 0) {
      parts.push(`### Постоянные персонажи истории (${ctx.characters.length})\n${lines.join('\n')}`);
    }
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

    // Получаем текущий bible и всех существующих персонажей
    const [{ data: existing }, { data: existingChars }] = await Promise.all([
      db.from('story_bibles')
        .select('*')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .maybeSingle(),
      db.from('story_characters')
        .select('name, current_status')
        .eq('user_id', userId)
        .eq('anime_id', animeId),
    ]);

    const totalChapters = (existing?.total_chapters ?? 0) + 1;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    });

    const systemMsg = `Ты — редактор длинного фанфика. Обновляй данные ТОЛЬКО на основе предоставленных глав. Отвечай СТРОГО в JSON без markdown-оберток.`;

    // Fix 2: передаём полный bible + полный контент главы (до 8000 символов)
    const existingSummary = existing?.summary ?? '';
    const existingPlotArc = existing?.plot_arc ?? '';
    const existingWorldState = existing?.world_state ?? '';
    const fullContent = chapterContent.slice(0, 8000);

    // Fix 3: список существующих персонажей для детекции изменений статуса
    const existingCharsJson = existingChars && existingChars.length > 0
      ? JSON.stringify(existingChars.map(c => ({ name: c.name, current_status: c.current_status })))
      : '[]';

    const userMsg = `Ты редактор фанфика. Вот текущее состояние истории и новая глава.

ТЕКУЩИЙ SUMMARY (события всех предыдущих глав):
${existingSummary || '(первая глава — summary пустой)'}

ТЕКУЩАЯ СЮЖЕТНАЯ АРКА:
${existingPlotArc || '(нет)'}

ТЕКУЩЕЕ СОСТОЯНИЕ МИРА:
${existingWorldState || '(нет)'}

СУЩЕСТВУЮЩИЕ ПЕРСОНАЖИ И ИХ СТАТУСЫ:
${existingCharsJson}

НОВАЯ ГЛАВА (глава ${totalChapters}): "${chapterTitle}"
Краткое содержание: ${chapterSummary}
Полный текст:
${fullContent}

Верни СТРОГО JSON (без markdown):
{
  "summary": "НАКОПИТЕЛЬНЫЙ summary всей истории — сохраняй события всех предыдущих глав и добавляй события этой. НЕ заменяй старый summary, а дополняй его. 500-1500 слов на русском.",
  "plot_arc": "главная нерешённая сюжетная арка после этой главы, 2-4 предложения",
  "world_state": "текущее состояние мира после этой главы, 2-5 предложений",
  "events": [{"description": "...", "importance": 1-10, "event_type": "plot-point|death|meeting|conflict|resolution|revelation|other"}],
  "character_updates": [
    {"name": "имя персонажа из списка выше", "new_status": "alive|dead|missing|transformed|left-story|unknown", "reason": "краткое обоснование из текста главы"}
  ]
}

ВАЖНО для character_updates: включай ТОЛЬКО персонажей из списка выше с ЯВНЫМИ изменениями статуса в тексте главы. Не изменяй статус без явных доказательств в тексте.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemMsg,
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed: any = {};
    try {
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

    // Fix 1: Upsert персонажей из customCharacters с правильным first_chapter_id
    // first_chapter_id ставим ТОЛЬКО при первом появлении (через INSERT ... ON CONFLICT DO UPDATE без перезаписи)
    for (const char of customCharacters) {
      if (!char.name) continue;
      const { data: existing_char } = await db
        .from('story_characters')
        .select('id, first_chapter_id')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .ilike('name', char.name)
        .maybeSingle();

      if (existing_char) {
        // Обновляем только last_chapter_id и description (если новое не пустое)
        const updateData: Record<string, unknown> = {
          last_chapter_id: chapterId,
          updated_at: new Date().toISOString(),
        };
        if (char.role) updateData.role = char.role;
        await db.from('story_characters')
          .update(updateData)
          .eq('id', existing_char.id);
      } else {
        // Первое появление — ставим first_chapter_id
        await db.from('story_characters').insert({
          user_id: userId,
          anime_id: animeId,
          name: char.name,
          role: char.role || null,
          current_status: 'alive',
          first_chapter_id: chapterId,
          last_chapter_id: chapterId,
        });
      }
    }

    // Fix 3: Обновляем статусы из bible response (только с явными доказательствами)
    if (Array.isArray(parsed.character_updates)) {
      for (const upd of parsed.character_updates) {
        if (!upd?.name || !upd?.new_status) continue;
        const validStatuses = ['alive', 'dead', 'missing', 'transformed', 'left-story', 'unknown', 'active'];
        if (!validStatuses.includes(upd.new_status)) continue;
        await db.from('story_characters')
          .update({
            current_status: upd.new_status,
            last_chapter_id: chapterId,
            updated_at: new Date().toISOString(),
          })
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
          current_status: 'alive',
        }))
      );
    }

    return { ok: true, message: `Bible пересобран из ${chapters.length} глав, ${deduped.length} персонажей` };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? String(err) };
  }
}
