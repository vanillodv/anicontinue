import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

const service = serviceClient;

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: denied.error === 'Unauthorized' ? 401 : 403 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ['plan', 'chapters_limit', 'chapters_used', 'role'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const { error } = await service().from('profiles').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
