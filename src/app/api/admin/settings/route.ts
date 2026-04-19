import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { data, error } = await serviceClient()
    .from('site_settings')
    .select('key, value');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Преобразуем в объект { key: value }
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const body: Record<string, string> = await req.json();
  const allowed = ['default_chapters_limit', 'registration_enabled', 'maintenance_mode', 'site_notice'];

  const upserts = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([key, value]) => ({ key, value: String(value) }));

  if (upserts.length === 0) return NextResponse.json({ error: 'No valid settings' }, { status: 400 });

  const { error } = await serviceClient()
    .from('site_settings')
    .upsert(upserts, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
