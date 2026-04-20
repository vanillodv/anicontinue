import { createClient } from '@/lib/supabase/server';
import { getAdminContext, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const supabase = await createClient();
  const { data } = await supabase.from('ai_prompts').select('*').order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { version, system_prompt } = await req.json();
  if (!version || !system_prompt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_prompts')
    .insert({ version, system_prompt, is_active: false, created_by: auth.ctx.userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'prompt.create',
    targetType: 'ai_prompt',
    targetId: data.id,
    new: { version },
  });

  return NextResponse.json(data);
}
