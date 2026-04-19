import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;
  const { data, error } = await serviceClient().from('anime').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

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

  const { error } = await serviceClient().from('anime').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;
  const { error } = await serviceClient().from('anime').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
