import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { seedAnime } from '@/lib/data/seed-anime';

export async function GET() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('anime')
      .upsert(seedAnime, { onConflict: 'id' })
      .select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0 
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
