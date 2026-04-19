import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data, error } = await supabase.rpc('toggle_suggestion_vote', {
    p_suggestion_id: id,
    p_user_id: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
