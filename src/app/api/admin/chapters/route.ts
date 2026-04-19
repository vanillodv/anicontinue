import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

const service = serviceClient;

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: denied.error === 'Unauthorized' ? 401 : 403 });

  const tab = req.nextUrl.searchParams.get('tab') ?? 'public';

  const query = service()
    .from('chapters')
    .select('id, title, is_public, is_deleted, created_at, user_id, anime(title_ru), profiles!chapters_user_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (tab === 'deleted') query.eq('is_deleted', true);
  else query.eq('is_public', true).eq('is_deleted', false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
