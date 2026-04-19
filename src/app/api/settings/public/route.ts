import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/settings';

export async function GET() {
  const s = await getSiteSettings();
  return NextResponse.json({
    registration_enabled: s.registration_enabled,
    maintenance_mode: s.maintenance_mode,
  });
}
