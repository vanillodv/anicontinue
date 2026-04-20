import { createClient } from '@/lib/supabase/server';
import { getAdminContext, requireAdmin, serviceClient } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

// Получить одну главу с контентом
export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;
  const { data, error } = await serviceClient()
    .from('chapters')
    .select('id, title, content, created_at, is_public, anime(title_ru), profiles!chapters_user_id_fkey(username)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Soft-delete / restore
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { action } = await req.json(); // 'delete' | 'restore' | 'unpublish'
  const supabase = await createClient();

  const update: Record<string, any> =
    action === 'delete'    ? { is_deleted: true, deleted_at: new Date().toISOString() } :
    action === 'restore'   ? { is_deleted: false, deleted_at: null } :
    action === 'unpublish' ? { is_public: false } : {};

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { error } = await supabase.from('chapters').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'chapter.' + action,
    targetType: 'chapter',
    targetId: id,
    new: update,
  });

  return NextResponse.json({ ok: true });
}
