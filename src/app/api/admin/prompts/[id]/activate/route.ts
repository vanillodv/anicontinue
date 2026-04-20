import { createClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin/guard';
import { logAdminAction } from '@/lib/admin/audit';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await getAdminContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = await createClient();

  // Деактивируем все, активируем нужный
  await supabase.from('ai_prompts').update({ is_active: false }).neq('id', id);
  await supabase.from('ai_prompts').update({ is_active: true }).eq('id', id);

  await logAdminAction({
    adminId: auth.ctx.userId,
    action: 'prompt.activate',
    targetType: 'ai_prompt',
    targetId: id,
    new: { is_active: true },
  });

  return NextResponse.json({ ok: true });
}
