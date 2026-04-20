import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateSchema, sanitizeInput } from '@/lib/validate';
import { buildPrompt } from '@/lib/prompts/master';
import { createClient as createSvcClient } from '@supabase/supabase-js';

// Логируем ошибку генерации (не бросает исключений)
async function logGenError(
  userId: string | null,
  animeId: number | null,
  errorType: string,
  message: string
) {
  try {
    const svc = createSvcClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await svc.from('generation_errors').insert({
      user_id: userId,
      anime_id: animeId,
      error_type: errorType,
      error_message: String(message).slice(0, 500),
    });
  } catch { /* silent */ }
}

export const maxDuration = 10;
export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const result = generateSchema.safeParse(body);
    if (!result.success) {
      console.error('Validation failed:', result.error.format());
      return NextResponse.json({ error: 'INVALID_INPUT', details: result.error.format() }, { status: 400 });
    }

    const params = {
      animeId: result.data.animeId,
      mood: result.data.mood,
      sceneType: result.data.sceneType,
      endingContext: sanitizeInput(result.data.endingContext || ''),
      startingPoint: sanitizeInput(result.data.startingPoint || ''),
      continuePrevious: result.data.continuePrevious,
      isPublic: result.data.isPublic ?? false,
      customCharacters: (result.data.customCharacters || []).map(c => ({
        name: sanitizeInput(c.name),
        role: sanitizeInput(c.role),
      })).filter(c => c.name.length > 0),
    };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Гость не может генерировать
    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    console.log('User ID:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) console.error('Profile fetch error:', profileError);

    if (profile?.role === 'banned') {
      return NextResponse.json({ error: 'BANNED', message: 'Ваш аккаунт заблокирован.' }, { status: 403 });
    }

    if (profile && profile.chapters_used >= profile.chapters_limit) {
      console.log('Limit reached for user');
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 });
    }

    let previousChapters: any[] = [];
    if (params.continuePrevious && user) {
      const { data: prev } = await supabase
        .from('chapters')
        .select('title, summary')
        .eq('user_id', user.id)
        .eq('anime_id', params.animeId)
        .order('created_at', { ascending: false })
        .limit(3);
      previousChapters = prev || [];
    }

    const { data: anime, error: animeError } = await supabase
      .from('anime')
      .select('*')
      .eq('id', params.animeId)
      .single();

    if (animeError || !anime) {
      console.error('Anime fetch error:', animeError);
      return NextResponse.json({ error: 'ANIME_NOT_FOUND' }, { status: 404 });
    }

    const { data: activePrompt } = await supabase
      .from('ai_prompts')
      .select('system_prompt')
      .eq('is_active', true)
      .limit(1)
      .single();

    const baseSystemPrompt = activePrompt?.system_prompt || 
      "Ты автор фанфика. Пиши ТОЛЬКО на русском. PG-13, без галлюцинаций канона.";
    
    const finalSystemPrompt = `${baseSystemPrompt}\nОтвечай СТРОГО в формате XML: <title>Название</title><content>Текст главы</content><summary>Краткая сводка для следующей главы</summary>. Контент PG-13.`;

    const { system: generatedSystem, user: userPrompt } = buildPrompt(anime, params, previousChapters);
    const systemPrompt = `${finalSystemPrompt}\n\n${generatedSystem}`;

    console.log('Calling Anthropic with model: claude-haiku-4-5-20251001');

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

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

        try {
          console.log('Stream started');
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

          console.log('Stream finished, finalizing...');
          const finalResponse = await stream.finalMessage();
          const usage = finalResponse.usage;
          let chapterId = null;

          if (user) {
            const { data: chapter, error: chapterErr } = await supabase
              .from('chapters')
              .insert({
                user_id: user.id,
                anime_id: params.animeId,
                title: title || 'Без названия',
                content: content || 'Текст отсутствует',
                summary: summary || '',
                scene_params: params,
                is_public: params.isPublic
              })
              .select('id')
              .single();

            if (chapterErr) {
              console.error('Database Error (Insert Chapter):', JSON.stringify(chapterErr));
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'db_error', message: chapterErr.message, code: chapterErr.code }) + '\n'));
            } else {
              chapterId = chapter.id;
              await supabase.from('profiles')
                .update({ chapters_used: (profile?.chapters_used || 0) + 1 })
                .eq('id', user.id);
            }
          }

          await supabase.from('ai_usage_logs').insert({
            user_id: user?.id || null,
            chapter_id: chapterId,
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cost_usd: (usage.input_tokens * 0.003 + usage.output_tokens * 0.015) / 1000, 
            model: 'claude-haiku-4-5-20251001'
          });

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', chapterId: chapterId || 'guest' }) + '\n'));
          controller.close();
          console.log('--- END GENERATION REQUEST ---');
        } catch (err: any) {
          console.error('STREAM ERROR:', err);
          await logGenError(
            user?.id ?? null,
            params.animeId,
            err?.message?.toLowerCase().includes('timeout') ? 'timeout' : 'stream_error',
            err?.message ?? String(err)
          );
          controller.error(err);
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
    console.error('TOP-LEVEL ERROR:', error);
    await logGenError(null, null, 'ai_error', error?.message ?? String(error));
    return NextResponse.json(
      { error: 'GENERATION_FAILED', message: error.message },
      { status: 500 }
    );
  }
}
