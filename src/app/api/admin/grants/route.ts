import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextResponse } from 'next/server';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { data, error } = await serviceClient()
    .from('generation_grants')
    .select(`
      id, amount, note, created_at,
      user:user_id (id, username),
      admin:admin_id (id, username)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
