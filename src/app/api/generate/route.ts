import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateSchema, sanitizeInput } from '@/lib/validate';
import { buildPrompt } from '@/lib/prompts/master';
import { createClient as createSvcClient } from '@supabase/supabase-js';
import {
  loadStoryContext,
  updateStoryBibleAsync,
} from '@/lib/story/bible';

function svc() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function logGenError(
  userId: string | null,
  animeId: number | null,
  errorType: string,
  message: string
) {
  try {
    await svc().from('generation_errors').insert({
      user_id: userId,
      anime_id: animeId,
      error_type: errorType,
      error_message: String(message).slice(0, 500),
    });
  } catch { /* silent */ }
}

async function refundChapter(userId: string) {
  try { await svc().rpc('refund_chapter', { p_user_id: userId }); }
  catch (e) { console.error('refund_chapter failed:', e); }
}

// Обёртка с экспоненциальным backoff (1s → 3s → 9s).
// Не повторяет 4xx — они означают ошибку клиента, а не сервера.
async function streamWithRetry(
  client: Anthropic,
  params: Parameters<Anthropic['messages']['stream']>[0],
  maxAttempts = 3
): Promise<ReturnType<Anthropic['messages']['stream']>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return client.messages.stream(params);
    } catch (err: unknown) {
      lastError = err;
      const apiErr = err as { status?: number };
      if (apiErr.status && apiErr.status >= 400 && apiErr.status < 500) throw err;
      if (attempt < maxAttempts) {
        const delay = 1000 * Math.pow(3, attempt - 1);
        console.warn(`[generate] Anthropic error attempt ${attempt}/${maxAttempts}, retry in ${delay}ms:`, (err as Error)?.message);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
});

const USER_RPM = 5;
const IP_RPM = 10;
const WINDOW_SEC = 60;

export async function POST(req: Request) {
  let consumedUserId: string | null = null;
  // Корреляционный id для трассировки стадий в логах прода:
  // grep -E "\[gen=ABC123\]" → весь жизненный цикл одного запроса.
  const reqId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();
  const log = (stage: string, extra?: Record<string, unknown>) =>
    console.log(`[gen=${reqId}] step=${stage} dt=${Date.now() - t0}ms`, extra ?? '');

  try {
    log('start');
    // Fix 8: auth ПЕРЕД Zod — анонимы получают 401, а не 400
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const cookieHeader = req.headers.get('cookie') || '';
      const sbCookies = cookieHeader
        .split(';')
        .map((c) => c.trim().split('=')[0])
        .filter((n) => n.startsWith('sb-'));
      const diag = `authError=${authError?.message || 'null'} user=null sbCookies=[${sbCookies.join(',')}]`;
      log('auth_failed', { diag });
      await logGenError(null, null, 'auth_error', diag.slice(0, 500));
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    log('auth_ok', { userId: user.id });

    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      log('body_parse_failed', { err: (e as Error).message });
      await logGenError(user.id, null, 'invalid_input', `json_parse: ${(e as Error).message}`);
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }
    const result = generateSchema.safeParse(body);
    if (!result.success) {
      log('zod_failed', result.error.flatten().fieldErrors);
      await logGenError(user.id, (body as { animeId?: number })?.animeId ?? null, 'invalid_input',
        JSON.stringify(result.error.flatten().fieldErrors).slice(0, 400));
      return NextResponse.json(
        { error: 'INVALID_INPUT', details: result.error.format() },
        { status: 400 }
      );
    }
    log('zod_ok', { animeId: result.data.animeId, sceneType: result.data.sceneType });

    const params = {
      animeId: result.data.animeId,
      mood: result.data.mood,
      sceneType: result.data.sceneType,
      endingContext: sanitizeInput(result.data.endingContext || ''),
      startingPoint: sanitizeInput(result.data.startingPoint || ''),
      continuePrevious: result.data.continuePrevious,
      isPublic: result.data.isPublic ?? false,
      customCharacters: (result.data.customCharacters || [])
        .map(c => ({ name: sanitizeInput(c.name), role: sanitizeInput(c.role) }))
        .filter(c => c.name.length > 0),
    };

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const svcClient = svc();

    const [{ data: userOk }, { data: ipOk }] = await Promise.all([
      svcClient.rpc('check_rate_limit', {
        p_key: `gen:user:${user.id}`,
        p_window_seconds: WINDOW_SEC,
        p_limit: USER_RPM,
      }),
      svcClient.rpc('check_rate_limit', {
        p_key: `gen:ip:${ip}`,
        p_window_seconds: WINDOW_SEC,
        p_limit: IP_RPM,
      }),
    ]);

    if (userOk === false || ipOk === false) {
      log('rate_limited', { userOk, ipOk });
      await logGenError(user.id, params.animeId, 'rate_limited', `userOk=${userOk} ipOk=${ipOk}`);
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Слишком много запросов. Подождите минуту.' },
        { status: 429 }
      );
    }
    log('rate_ok');

    const { data: canProceed, error: rpcError } = await svcClient.rpc('consume_chapter', {
      p_user_id: user.id,
    });

    if (rpcError) {
      log('consume_failed', { code: rpcError.code, message: rpcError.message });
      await logGenError(user.id, params.animeId, 'db_error',
        `consume_chapter: ${rpcError.message || rpcError.code || JSON.stringify(rpcError)}`);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    if (!canProceed) {
      const { data: profile } = await svcClient
        .from('profiles')
        .select('role, chapters_used, chapters_limit')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'banned') {
        await logGenError(user.id, params.animeId, 'banned', 'role=banned');
        return NextResponse.json(
          { error: 'BANNED', message: 'Ваш аккаунт заблокирован.' },
          { status: 403 }
        );
      }
      await logGenError(user.id, params.animeId, 'limit_reached',
        `used=${profile?.chapters_used} limit=${profile?.chapters_limit}`);
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 });
    }

    consumedUserId = user.id;
    log('consumed');

    // Fix 3: shouldLoadContext по sceneType, не по continuePrevious
    // continuation / alternative / own-ending — всегда загружаем историю пользователя
    const shouldLoadContext = ['continuation', 'alternative', 'own-ending']
      .includes(params.sceneType ?? '');

    // Загружаем аниме и (при нужном типе) контекст параллельно.
    // loadStoryContext не должен ронять весь запрос — таблицы story_*
    // могут быть не созданы на старых окружениях. Проглатываем и идём дальше.
    const [animeResult, storyCtx] = await Promise.all([
      supabase.from('anime').select('*').eq('id', params.animeId).single(),
      shouldLoadContext
        ? loadStoryContext(user.id, params.animeId, params.sceneType ?? '').catch((e) => {
            log('story_ctx_failed', { msg: (e as Error)?.message });
            return null;
          })
        : Promise.resolve(null),
    ]);

    const { data: anime, error: animeError } = animeResult;
    if (animeError || !anime) {
      log('anime_not_found', { animeId: params.animeId, err: animeError?.message });
      await logGenError(user.id, params.animeId, 'anime_not_found',
        animeError?.message || `id=${params.animeId}`);
      await refundChapter(user.id);
      consumedUserId = null;
      return NextResponse.json({ error: 'ANIME_NOT_FOUND' }, { status: 404 });
    }
    log('anime_loaded', { contextLoaded: !!storyCtx });

    // Fix 1: svc() для чтения ai_prompts — обходит RLS-блокировку обычных пользователей
    const { data: activePrompt } = await svc()
      .from('ai_prompts')
      .select('system_prompt, version')
      .eq('is_active', true)
      .limit(1)
      .single();

    log('prompt_loaded', { version: activePrompt?.version ?? 'fallback' });

    const baseSystemPrompt = activePrompt?.system_prompt ||
      'Ты автор фанфика. Пиши ТОЛЬКО на русском. PG-13, без галлюцинаций канона.';

    const finalSystemPrompt =
      `${baseSystemPrompt}\nОтвечай СТРОГО в формате XML: <title>Название</title><content>Текст главы</content><summary>Краткая сводка для следующей главы</summary>. Контент PG-13.`;

    // Fix 4: объединяем recurring characters из истории с новыми из формы
    const recurringChars = storyCtx?.recurringCharacters ?? [];
    const allCustomChars = dedupeCharacters([...recurringChars, ...params.customCharacters]);

    const { system: generatedSystem, user: userPrompt } = buildPrompt(
      anime,
      { ...params, customCharacters: allCustomChars },
      storyCtx,
    );
    const systemPrompt = `${finalSystemPrompt}\n\n${generatedSystem}`;

    log('prompt_built', {
      contextLoaded: shouldLoadContext,
      totalChapters: storyCtx?.bible?.total_chapters ?? 0,
      recurringChars: recurringChars.length,
      promptLen: systemPrompt.length,
    });

    const stream = await streamWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
      temperature: 0.85,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    log('stream_started');

    const userId = user.id;
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let title = '';
        let content = '';
        let summary = '';
        let titleSent = false;
        let contentSent = false;
        let summarySent = false;
        let chapterSaved = false;

        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = (chunk.delta as any).text;
              fullText += text;

              if (!titleSent && fullText.includes('<title>') && fullText.includes('</title>')) {
                title = fullText.split('<title>')[1].split('</title>')[0];
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'title', payload: title }) + '\n'));
                titleSent = true;
              }

              if (fullText.includes('<content>')) {
                const parts = fullText.split('<content>');
                if (parts.length > 1) {
                  const afterContent = parts[1];
                  if (afterContent.includes('</content>')) {
                    const contentValue = afterContent.split('</content>')[0];
                    if (!contentSent) {
                      const newPart = contentValue.slice(content.length);
                      if (newPart) {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'content', payload: newPart }) + '\n'));
                        content = contentValue;
                      }
                      contentSent = true;
                    }
                  } else {
                    const newPart = afterContent.slice(content.length);
                    if (newPart) {
                      controller.enqueue(encoder.encode(JSON.stringify({ type: 'content', payload: newPart }) + '\n'));
                      content += newPart;
                    }
                  }
                }
              }

              if (!summarySent && fullText.includes('<summary>') && fullText.includes('</summary>')) {
                summary = fullText.split('<summary>')[1].split('</summary>')[0];
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'summary', payload: summary }) + '\n'));
                summarySent = true;
              }
            }
          }

          const finalResponse = await stream.finalMessage();
          // usage иногда отсутствует на оборванных стримах — защита от NaN.
          const usage = finalResponse.usage ?? { input_tokens: 0, output_tokens: 0 };
          let chapterId: string | null = null;

          log('stream_done', {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            contentLen: content.length,
            titleLen: title.length,
            summaryLen: summary.length,
          });

          // Если контент совсем пустой — это ошибка генерации, а не успех.
          // Возвращаем deniм + рефанд.
          if (!content && !title) {
            log('empty_response');
            await logGenError(userId, params.animeId, 'ai_error', 'empty response from claude');
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: 'ai_error', message: 'Модель вернула пустой ответ. Главу не списали.' }) + '\n'
            ));
            await refundChapter(userId);
            controller.close();
            return;
          }

          const cleanTitle = (title || 'Без названия').replace(/^[\s#*]+/, '').trim() || 'Без названия';
          const cleanContent = (content || 'Текст отсутствует').replace(/^\s+/, '');
          const cleanSummary = (summary || '').replace(/^\s+/, '');

          const { data: chapter, error: chapterErr } = await supabase
            .from('chapters')
            .insert({
              user_id: userId,
              anime_id: params.animeId,
              title: cleanTitle,
              content: cleanContent,
              summary: cleanSummary,
              scene_params: {
                ...params,
                customCharacters: allCustomChars,
              },
              is_public: params.isPublic,
              is_alternative_branch: params.sceneType === 'alternative',
            })
            .select('id')
            .single();

          if (chapterErr) {
            log('insert_failed', { code: chapterErr.code, message: chapterErr.message });
            await logGenError(userId, params.animeId, 'db_error',
              `chapters_insert: ${chapterErr.code || ''} ${chapterErr.message || ''}`.slice(0, 400));
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: 'db_error', message: chapterErr.message, code: chapterErr.code }) + '\n'
            ));
            await refundChapter(userId);
          } else {
            chapterId = chapter.id;
            chapterSaved = true;
            log('chapter_saved', { chapterId });
          }

          // Fix 2: ai_usage_logs через svc() — обходит отсутствующую INSERT-политику.
          // Не роняем стрим, если usage_logs упадут — пользователь уже получил главу.
          try {
            await svc().from('ai_usage_logs').insert({
              user_id: userId,
              chapter_id: chapterId,
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              cost_usd: (usage.input_tokens * 0.003 + usage.output_tokens * 0.015) / 1000,
              model: 'claude-haiku-4-5-20251001',
            });
          } catch (e) {
            log('usage_log_failed', { msg: (e as Error)?.message });
          }

          controller.enqueue(encoder.encode(
            JSON.stringify({ type: 'done', chapterId: chapterId || 'error' }) + '\n'
          ));
          controller.close();
          log('done');

          // Фоновое обновление Story Bible — после закрытия стрима, не блокирует ответ
          if (chapterId && chapterSaved) {
            updateStoryBibleAsync(
              userId,
              params.animeId,
              chapterId,
              cleanTitle,
              cleanContent,
              cleanSummary,
              allCustomChars,
            ).catch(err => console.error('[story-bible] async update error:', err));
          }

        } catch (err: any) {
          log('stream_error', {
            chapterSaved,
            msg: err?.message,
            stack: (err?.stack || '').slice(0, 200),
          });
          if (!chapterSaved) await refundChapter(userId);
          await logGenError(
            userId,
            params.animeId,
            err?.message?.toLowerCase().includes('timeout') ? 'timeout' : 'stream_error',
            err?.message ?? String(err)
          );
          // Сообщаем клиенту явный JSON, иначе ReadableStream закроется без типа
          // и фронт зависает в "thinking…".
          try {
            controller.enqueue(encoder.encode(
              JSON.stringify({ type: 'stream_error', message: err?.message || 'stream failed' }) + '\n'
            ));
            controller.close();
          } catch {
            controller.error(err);
          }
        }
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    log('top_level_error', { msg: error?.message, stack: (error?.stack || '').slice(0, 300) });
    if (consumedUserId) await refundChapter(consumedUserId);
    await logGenError(consumedUserId, null, 'ai_error', error?.message ?? String(error));
    return NextResponse.json(
      { error: 'GENERATION_FAILED', message: error?.message ?? 'unknown' },
      { status: 500 }
    );
  }
}

// Дедуп по имени — новые персонажи из формы перезаписывают recurring по имени.
function dedupeCharacters(chars: Array<{ name: string; role: string }>) {
  const map = new Map<string, { name: string; role: string }>();
  for (const c of chars) {
    map.set(c.name.toLowerCase(), c);
  }
  return Array.from(map.values());
}
