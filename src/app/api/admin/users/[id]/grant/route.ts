import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;
  const { amount, note } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const svc = serviceClient();

  // Получаем текущий лимит
  const { data: profile } = await svc.from('profiles').select('chapters_limit').eq('id', id).single();
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const newLimit = profile.chapters_limit + amount;

  const [updateResult, logResult] = await Promise.all([
    svc.from('profiles').update({ chapters_limit: newLimit }).eq('id', id),
    svc.from('generation_grants').insert({
      admin_id: user?.id ?? null,
      user_id: id,
      amount,
      note: note || '',
    }),
  ]);

  if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  if (logResult.error) console.error('Grant log error:', logResult.error);

  return NextResponse.json({ ok: true, new_limit: newLimit });
}
