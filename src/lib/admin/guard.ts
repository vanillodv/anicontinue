import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export type AdminContext = { userId: string; role: 'admin' | 'super_admin' };

export async function requireAdmin(): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden' };
  }
  return null;
}

// Возвращает контекст админа (id и role) либо ошибку. Нужно в роутах,
// которые меняют других пользователей, чтобы предотвратить self-ban
// и эскалацию admin → super_admin.
export async function getAdminContext(): Promise<
  { error: string; status: number } | { ctx: AdminContext }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { ctx: { userId: user.id, role: profile.role as 'admin' | 'super_admin' } };
}

// Guard для модификации другого пользователя: запрещает действовать на себя
// и на super_admin (последнее разрешено только super_admin'у).
export async function guardUserTarget(
  ctx: AdminContext,
  targetId: string
): Promise<{ error: string; status: number } | null> {
  if (ctx.userId === targetId) {
    return { error: 'Cannot modify self', status: 403 };
  }

  const svc = serviceClient();
  const { data: target, error } = await svc
    .from('profiles')
    .select('role')
    .eq('id', targetId)
    .single();

  if (error || !target) return { error: 'User not found', status: 404 };

  if (target.role === 'super_admin' && ctx.role !== 'super_admin') {
    return { error: 'Cannot modify super_admin', status: 403 };
  }

  return null;
}

export async function requireAdminPage(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/');
  }
}

// Service-role client for admin API routes (bypasses RLS)
export function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
