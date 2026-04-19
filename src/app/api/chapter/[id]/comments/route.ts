import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

// ── GET /api/chapter/[id]/comments ───────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('chapter_comments')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles:user_id ( username )
    `)
    .eq('chapter_id', chapterId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 500 });
  }

  const comments = (data ?? []).map((c: any) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    username: c.profiles?.username ?? 'Аноним',
  }));

  return NextResponse.json(comments);
}

// ── POST /api/chapter/[id]/comments ──────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const content = (body.content ?? '').trim();

  if (!content || content.length < 1) {
    return NextResponse.json({ error: 'EMPTY_COMMENT' }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: 'TOO_LONG' }, { status: 400 });
  }

  // Make sure chapter exists and is public (or belongs to user)
  const { data: chapter, error: chapterErr } = await supabase
    .from('chapters')
    .select('id, is_public, user_id')
    .eq('id', chapterId)
    .single();

  if (chapterErr || !chapter) {
    return NextResponse.json({ error: 'CHAPTER_NOT_FOUND' }, { status: 404 });
  }

  if (!chapter.is_public && chapter.user_id !== user.id) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { data: comment, error: insertErr } = await supabase
    .from('chapter_comments')
    .insert({ chapter_id: chapterId, user_id: user.id, content })
    .select(`id, content, created_at, user_id, profiles:user_id ( username )`)
    .single();

  if (insertErr) {
    console.error('Comment insert error:', insertErr);
    return NextResponse.json({ error: 'INSERT_FAILED' }, { status: 500 });
  }

  return NextResponse.json({
    id: (comment as any).id,
    content: (comment as any).content,
    created_at: (comment as any).created_at,
    user_id: (comment as any).user_id,
    username: (comment as any).profiles?.username ?? 'Аноним',
  }, { status: 201 });
}

// ── DELETE /api/chapter/[id]/comments ────────────────────────────────────────
// Body: { commentId }
export async function DELETE(req: NextRequest, { params }: Params) {
  await params; // unused but required by convention
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const { commentId } = body;
  if (!commentId) return NextResponse.json({ error: 'MISSING_COMMENT_ID' }, { status: 400 });

  const { error } = await supabase
    .from('chapter_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id); // RLS: only own

  if (error) {
    return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
