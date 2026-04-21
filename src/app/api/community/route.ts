import { serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get('sort') ?? 'new';
  const supabase = serviceClient();

  const orderColumn = sort === 'popular' ? 'likes_count' : 'created_at';

  // Берём больше чем нужно, чтобы потом отфильтровать под разнообразие
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
    .limit(60);

  if (error) {
    console.error('Community feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch community feed' }, { status: 500 });
  }

  // Диверсификация: не больше 2 глав подряд от одного автора или по одному аниме.
  // Это убирает антидоказательство, когда лента выглядит как моноспектакль.
  const raw = (data ?? []) as any[];
  const authorSeen = new Map<string, number>();
  const animeSeen = new Map<number, number>();
  const diverse: any[] = [];
  const rest: any[] = [];
  for (const ch of raw) {
    const ac = authorSeen.get(ch.user_id) ?? 0;
    const nc = animeSeen.get(ch.anime_id) ?? 0;
    if (ac < 2 && nc < 2) {
      diverse.push(ch);
      authorSeen.set(ch.user_id, ac + 1);
      animeSeen.set(ch.anime_id, nc + 1);
    } else {
      rest.push(ch);
    }
    if (diverse.length >= 20) break;
  }
  // Дополним если разнообразия не хватает
  const finalList = diverse.concat(rest).slice(0, 20);

  const items = finalList.map((chapter: any) => ({
    id: chapter.id,
    title: chapter.title,
    preview: chapter.content ? chapter.content.replace(/^\s+/, '').replace(/\s+/g, ' ').slice(0, 200) : '',
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
