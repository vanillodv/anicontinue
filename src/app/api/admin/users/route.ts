import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextResponse } from 'next/server';

const service = serviceClient;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: denied.error === 'Unauthorized' ? 401 : 403 });

  const [{ data: profiles, error }, { data: authData }] = await Promise.all([
    service()
      .from('profiles')
      .select('id, username, plan, role, chapters_used, chapters_limit, created_at')
      .order('created_at', { ascending: false }),
    service().auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emailMap = new Map((authData?.users ?? []).map((u: any) => [u.id, u.email as string]));
  const result = (profiles ?? []).map(p => ({ ...p, email: emailMap.get(p.id) ?? null }));

  return NextResponse.json(result);
}
