import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextResponse } from 'next/server';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { data, error } = await serviceClient()
    .from('generation_errors')
    .select('id, error_type, error_message, created_at, anime_id, user:user_id(username)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { error } = await serviceClient()
    .from('generation_errors')
    .delete()
    .lt('created_at', new Date(Date.now() - 7 * 86400_000).toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
