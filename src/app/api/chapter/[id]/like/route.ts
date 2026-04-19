import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Проверяем, лайкнул ли уже
  const { data: existing } = await supabase
    .from('chapter_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .single();

  if (existing) {
    // Снимаем лайк
    await supabase
      .from('chapter_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId);

    const { data: chapter } = await supabase
      .from('chapters')
      .select('likes_count')
      .eq('id', chapterId)
      .single();

    return NextResponse.json({ liked: false, likes_count: chapter?.likes_count ?? 0 });
  }

  // Ставим лайк
  await supabase.from('chapter_likes').insert({ user_id: user.id, chapter_id: chapterId });

  const { data: chapter } = await supabase
    .from('chapters')
    .select('likes_count')
    .eq('id', chapterId)
    .single();

  return NextResponse.json({ liked: true, likes_count: chapter?.likes_count ?? 0 });
}

// Получить статус лайка для текущего пользователя
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: chapter } = await supabase
    .from('chapters')
    .select('likes_count')
    .eq('id', chapterId)
    .single();

  if (!user) {
    return NextResponse.json({ liked: false, likes_count: chapter?.likes_count ?? 0 });
  }

  const { data: existing } = await supabase
    .from('chapter_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .single();

  return NextResponse.json({ liked: !!existing, likes_count: chapter?.likes_count ?? 0 });
}
