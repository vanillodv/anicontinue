import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET — список всех пожеланий + флаг "я голосовал"
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('votes', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let votedIds: string[] = [];
  if (user) {
    const { data: votes } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', user.id);
    votedIds = (votes || []).map((v: any) => v.suggestion_id);
  }

  return NextResponse.json({
    suggestions: suggestions || [],
    votedIds,
    userId: user?.id ?? null,
  });
}

// POST — создать новое пожелание
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { text } = await req.json();
  if (!text || text.trim().length < 10) {
    return NextResponse.json({ error: 'Минимум 10 символов' }, { status: 400 });
  }
  if (text.trim().length > 500) {
    return NextResponse.json({ error: 'Максимум 500 символов' }, { status: 400 });
  }

  const username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Аноним';

  const { data, error } = await supabase
    .from('suggestions')
    .insert({ user_id: user.id, username, text: text.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ suggestion: data });
}
