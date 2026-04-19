import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_EVENTS = new Set([
  'view_anime', 'start_generation', 'chapter_saved', 'chapter_liked', 'page_view',
]);

export async function POST(req: NextRequest) {
  const { event_name, event_data, session_id } = await req.json();

  if (!ALLOWED_EVENTS.has(event_name)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('analytics_events_raw').insert({
    event_name,
    event_data: event_data ?? {},
    session_id: session_id ?? 'unknown',
    user_id: user?.id ?? null,
  });

  return NextResponse.json({ ok: true });
}
