import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  const supabase = await createClient();

  try {
    let supabaseQuery = supabase
      .from('anime')
      .select('*');

    if (query) {
      // Поиск по русскому или английскому названию
      supabaseQuery = supabaseQuery.or(`title_ru.ilike.%${query}%,title_en.ilike.%${query}%`);
    } else {
      // Топ аниме по рейтингу
      supabaseQuery = supabaseQuery.order('score', { ascending: false }).limit(20);
    }

    const { data, error } = await supabaseQuery;

    if (error) throw error;
    
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch anime from database' }, { status: 500 });
  }
}
