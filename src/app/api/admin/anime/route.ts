import { getAdminContext, requireAdmin, serviceClient } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = 30;
  const from = (page - 1) * limit;

  let query = serviceClient()
    .from('anime')
    .select('id, title_ru, title_en, poster_url, score, year, status, episodes, studio', { count: 'exact' })
    .order('score', { ascending: false })
    .range(from, from + limit - 1);

  if (q) query = query.or(`title_ru.ilike.%${q}%,title_en.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const allowed = ['title_ru', 'title_en', 'title_jp', 'synopsis', 'genres', 'characters',
    'poster_url', 'score', 'year', 'studio', 'episodes', 'status', 'prompt_template', 'ending_context'];
  const insert: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) insert[key] = body[key];
  }

  const { data, error } = await serviceClient().from('anime').insert(insert).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'anime.create',
    targetType: 'anime',
    targetId: String(data.id),
    new: insert,
  });

  return NextResponse.json({ ok: true, id: data.id });
}
