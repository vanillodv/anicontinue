import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextResponse } from 'next/server';

const service = serviceClient;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: denied.error === 'Unauthorized' ? 401 : 403 });

  const { data, error } = await service()
    .from('profiles')
    .select('id, username, plan, role, chapters_used, chapters_limit, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
