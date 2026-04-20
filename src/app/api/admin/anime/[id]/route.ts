import { getAdminContext, serviceClient } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { data, error } = await serviceClient().from('anime').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();
  const allowed = ['title_ru', 'title_en', 'title_jp', 'synopsis', 'genres', 'characters',
    'poster_url', 'score', 'year', 'studio', 'episodes', 'status', 'prompt_template', 'ending_context'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const svc = serviceClient();
  const { error } = await svc.from('anime').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'anime.patch',
    targetType: 'anime',
    targetId: id,
    new: update,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const svc = serviceClient();

  const { data: oldRow } = await svc.from('anime').select('title_ru').eq('id', id).single();

  const { error } = await svc.from('anime').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'anime.delete',
    targetType: 'anime',
    targetId: id,
    old: oldRow,
  });

  return NextResponse.json({ ok: true });
}
