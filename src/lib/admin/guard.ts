import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

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
