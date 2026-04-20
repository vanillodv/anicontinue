import { getAdminContext, guardUserTarget, serviceClient } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

// POST — заблокировать пользователя
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const guard = await guardUserTarget(auth.ctx, id);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const svc = serviceClient();

  const { data: oldRow } = await svc.from('profiles').select('role').eq('id', id).single();

  // Обновляем роль в profiles (главная проверка в приложении)
  const { error: profileError } = await svc
    .from('profiles')
    .update({ role: 'banned' })
    .eq('id', id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Дополнительно баним в Supabase Auth (блокирует вход). Не критично если упадёт.
  try {
    await svc.auth.admin.updateUserById(id, { ban_duration: '876600h' });
  } catch { /* silent — основная блокировка через profiles.role */ }

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'user.ban',
    targetType: 'profile',
    targetId: id,
    old: oldRow,
    new: { role: 'banned' },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — разблокировать пользователя
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const guard = await guardUserTarget(auth.ctx, id);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const svc = serviceClient();

  const { data: oldRow } = await svc.from('profiles').select('role').eq('id', id).single();

  const { error: profileError } = await svc
    .from('profiles')
    .update({ role: 'user' })
    .eq('id', id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Снимаем Auth-бан. Не критично если упадёт.
  try {
    await svc.auth.admin.updateUserById(id, { ban_duration: 'none' });
  } catch { /* silent */ }

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'user.unban',
    targetType: 'profile',
    targetId: id,
    old: oldRow,
    new: { role: 'user' },
  });

  return NextResponse.json({ ok: true });
}
