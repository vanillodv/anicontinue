import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Защита: только Vercel Cron или внутренний вызов
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [
    { count: newUsers },
    { count: newChapters },
    { data: costData },
    { count: activeUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`),
    supabase.from('chapters').select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`).eq('is_deleted', false),
    supabase.from('ai_usage_logs').select('cost_usd')
      .gte('created_at', `${today}T00:00:00`),
    supabase.from('analytics_events_raw').select('user_id', { count: 'exact', head: true })
      .gte('event_time', `${today}T00:00:00`).not('user_id', 'is', null),
  ]);

  const totalCost = (costData ?? []).reduce((s: number, r: any) => s + (r.cost_usd ?? 0), 0);

  await supabase.from('analytics_daily').upsert({
    date: today,
    new_users: newUsers ?? 0,
    new_chapters: newChapters ?? 0,
    cost_usd: totalCost,
    active_users: activeUsers ?? 0,
  }, { onConflict: 'date' });

  return NextResponse.json({ ok: true, date: today });
}
