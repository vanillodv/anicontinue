import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

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

  return NextResponse.json({ ok: true });
}
