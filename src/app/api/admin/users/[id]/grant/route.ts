import { getAdminContext, guardUserTarget, serviceClient } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

const MAX_GRANT = 10000; // Санитарный лимит — защита от опечатки/абьюза

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ctx } = auth;

  const { id } = await params;
  const guard = await guardUserTarget(ctx, id);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { amount, note } = await req.json();
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_GRANT) {
    return NextResponse.json({ error: `Invalid amount (1..${MAX_GRANT})` }, { status: 400 });
  }

  const svc = serviceClient();

  // Получаем текущий лимит
  const { data: profile } = await svc.from('profiles').select('chapters_limit').eq('id', id).single();
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const newLimit = profile.chapters_limit + amount;

  const [updateResult, logResult] = await Promise.all([
    svc.from('profiles').update({ chapters_limit: newLimit }).eq('id', id),
    svc.from('generation_grants').insert({
      admin_id: ctx.userId,
      user_id: id,
      amount,
      note: note || '',
    }),
  ]);

  if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  if (logResult.error) console.error('Grant log error:', logResult.error);

  await logAdminAction({
    adminId: ctx.userId,
    action: 'user.grant',
    targetType: 'profile',
    targetId: id,
    old: { chapters_limit: profile.chapters_limit },
    new: { chapters_limit: newLimit, amount, note: note || '' },
  });

  return NextResponse.json({ ok: true, new_limit: newLimit });
}
