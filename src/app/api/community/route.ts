import { serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get('sort') ?? 'new';
  const supabase = serviceClient();

  const orderColumn = sort === 'popular' ? 'likes_count' : 'created_at';

  const { data, error } = await supabase
    .from('chapters')
    .select(`
      id,
      title,
      content,
      created_at,
      anime_id,
      user_id,
      likes_count,
      comments_count,
      rating,
      anime ( title_ru, poster_url ),
      profiles!chapters_user_id_fkey ( username )
    `)
    .eq('is_public', true)
    .eq('is_deleted', false)
    .order(orderColumn, { ascending: false })
    .limit(20);

  if (error) {
    console.error('Community feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch community feed' }, { status: 500 });
  }

  const items = (data ?? []).map((chapter: any) => ({
    id: chapter.id,
    title: chapter.title,
    preview: chapter.content ? chapter.content.slice(0, 200) : '',
    created_at: chapter.created_at,
    anime_id: chapter.anime_id,
    user_id: chapter.user_id,
    likes_count: chapter.likes_count ?? 0,
    comments_count: chapter.comments_count ?? 0,
    rating: chapter.rating ?? null,
    anime_title: chapter.anime?.title_ru ?? null,
    poster_url: chapter.anime?.poster_url ?? null,
    username: chapter.profiles?.username ?? null,
  }));

  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
