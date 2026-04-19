import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

// Soft-delete / restore
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: denied.error === 'Unauthorized' ? 401 : 403 });

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

  return NextResponse.json({ ok: true });
}
