import { requireAdmin, serviceClient } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;

  // Баним через Supabase Auth Admin + помечаем в profiles
  const [authResult, profileResult] = await Promise.all([
    serviceClient().auth.admin.updateUserById(id, { ban_duration: '876600h' }), // ~100 лет
    serviceClient().from('profiles').update({ role: 'banned' }).eq('id', id),
  ]);

  if (authResult.error) return NextResponse.json({ error: authResult.error.message }, { status: 500 });
  if (profileResult.error) return NextResponse.json({ error: profileResult.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: 403 });

  const { id } = await params;

  const [authResult, profileResult] = await Promise.all([
    serviceClient().auth.admin.updateUserById(id, { ban_duration: 'none' }),
    serviceClient().from('profiles').update({ role: 'user' }).eq('id', id),
  ]);

  if (authResult.error) return NextResponse.json({ error: authResult.error.message }, { status: 500 });
  if (profileResult.error) return NextResponse.json({ error: profileResult.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
