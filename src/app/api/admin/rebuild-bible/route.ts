import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { rebuildStoryBible } from '@/lib/story/bible';

// POST /api/admin/rebuild-bible?user_id=...&anime_id=...
// Пересобирает Story Bible из всех существующих глав пользователя.
// Используется когда bible повредился или был инициализирован некорректно.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  const animeIdStr = searchParams.get('anime_id');

  if (!userId || !animeIdStr) {
    return NextResponse.json(
      { error: 'Требуются user_id и anime_id' },
      { status: 400 }
    );
  }

  const animeId = parseInt(animeIdStr, 10);
  if (isNaN(animeId)) {
    return NextResponse.json({ error: 'anime_id должен быть числом' }, { status: 400 });
  }

  const result = await rebuildStoryBible(userId, animeId);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ message: result.message });
}
