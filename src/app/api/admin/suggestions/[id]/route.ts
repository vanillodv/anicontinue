import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ['new', 'reviewing', 'planned', 'done', 'declined'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('suggestions')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'suggestion.status',
    targetType: 'suggestion',
    targetId: id,
    new: { status },
  });

  return NextResponse.json({ ok: true });
}
