import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  // Деактивируем все, активируем нужный
  await supabase.from('ai_prompts').update({ is_active: false }).neq('id', id);
  await supabase.from('ai_prompts').update({ is_active: true }).eq('id', id);

  return NextResponse.json({ ok: true });
}
