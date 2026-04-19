import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const value = Number(body.value);

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
  }

  const { error } = await supabase
    .from('chapters')
    .update({ rating: value })
    .eq('id', chapterId)
    .eq('user_id', user.id); // только своя глава

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rating: value });
}
