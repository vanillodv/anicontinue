import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getMasterSystemPrompt } from '@/lib/prompts/master';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { animeId, mood, sceneType, endingContext, startingPoint, continuePrevious } = await request.json();

    if (!animeId) {
      return NextResponse.json({ error: 'Anime ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;
    let previousContext = "";

    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profile = profileData;

      if (profile && profile.chapters_used >= profile.chapters_limit) {
        return NextResponse.json({ error: 'limit_reached' }, { status: 403 });
      }

      // 1. Получаем предысторию (если нужно продолжить)
      if (continuePrevious) {
        const { data: prevChapters } = await supabase
          .from('chapters')
          .select('title, content')
          .eq('user_id', user.id)
          .eq('anime_id', animeId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (prevChapters && prevChapters.length > 0) {
          previousContext = prevChapters
            .reverse() // От старых к новым для логики ИИ
            .map(c => `Глава "${c.title}": ${c.content.slice(0, 400)}...`)
            .join("\n\n");
        }
      }
    }

    const { data: anime } = await supabase.from('anime').select('*').eq('id', animeId).single();
    if (!anime) return NextResponse.json({ error: 'Anime not found' }, { status: 404 });

    // 2. Генерация
    const systemPrompt = getMasterSystemPrompt(anime, endingContext, startingPoint, previousContext);
    const userPrompt = `Напиши сцену в настроении "${mood}". Тип: ${sceneType}. 
${continuePrevious ? "Это прямое продолжение моих предыдущих глав." : "Это новая история, начни с чистого листа."}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const fullText = message.content[0].type === 'text' ? message.content[0].text : '';
    const titleMatch = fullText.match(/НАЗВАНИЕ:\s*(.*)/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Новая глава';
    const content = fullText.replace(/НАЗВАНИЕ:.*\n?/i, '').trim();

    // 3. Сохранение
    if (user) {
      await supabase.from('chapters').insert({
        user_id: user.id,
        anime_id: animeId,
        title,
        content,
        scene_params: { mood, sceneType, endingContext, startingPoint, continuePrevious }
      });

      await supabase.from('profiles').update({ chapters_used: (profile?.chapters_used || 0) + 1 }).eq('id', user.id);
    }

    const response = NextResponse.json({ title, content });
    if (!user) response.headers.set('X-Guest', 'true');
    return response;

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
