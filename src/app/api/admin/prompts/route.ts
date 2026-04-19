import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const supabase = await createClient();
  const { data } = await supabase.from('ai_prompts').select('*').order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { version, system_prompt } = await req.json();
  if (!version || !system_prompt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('ai_prompts')
    .insert({ version, system_prompt, is_active: false, created_by: user!.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
