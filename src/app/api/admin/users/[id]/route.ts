import { getAdminContext, guardUserTarget, serviceClient } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

const SAFE_FIELDS = ['plan', 'chapters_limit', 'chapters_used'] as const;
const VALID_ROLES = ['user', 'moderator', 'admin', 'super_admin'] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ctx } = auth;

  const { id } = await params;
  const guard = await guardUserTarget(ctx, id);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const update: Record<string, any> = {};

  for (const key of SAFE_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  // Смена роли — только super_admin. Запрещаем ставить super_admin обычному админу даже если он сам super_admin (чтобы не плодить super_admin'ов — меняется вручную в БД).
  if ('role' in body) {
    if (ctx.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super_admin can change roles' }, { status: 403 });
    }
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (body.role === 'super_admin') {
      return NextResponse.json({ error: 'super_admin must be set directly in DB' }, { status: 403 });
    }
    update.role = body.role;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const svc = serviceClient();

  // Снимок до обновления для audit-log
  const { data: oldRow } = await svc
    .from('profiles')
    .select(Object.keys(update).join(','))
    .eq('id', id)
    .single();

  const { error } = await svc.from('profiles').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: ctx.userId,
    action: 'user.patch',
    targetType: 'profile',
    targetId: id,
    old: oldRow as any,
    new: update,
  });

  return NextResponse.json({ ok: true });
}
