import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: chapters }, { data: characters }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('chapters').select('*').eq('user_id', user.id).eq('is_deleted', false),
    supabase.from('characters').select('*').eq('user_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    chapters: chapters ?? [],
    characters: characters ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="anicontinue-data.json"`,
    },
  });
}
