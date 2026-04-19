import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zafbjeslpkprdqaiynqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZmJqZXNscGtwcmRxYWl5bnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMwODM1MywiZXhwIjoyMDkxODg0MzUzfQ.pH-Ivl71YzyVm_W1Xn7MAO_ZFxVlWPXxKnwgNv0WTDg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchJikan(id) {
  await delay(600);
  const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Jikan ${id}: ${res.status}`);
  const { data } = await res.json();
  return data;
}

async function main() {
  const { data: animeList, error } = await supabase
    .from('anime')
    .select('id, title_ru, title_en, genres, poster_url')
    .order('id');

  if (error) throw error;

  console.log(`Total anime in DB: ${animeList.length}\n`);
  console.log('--- Checking each anime against Jikan ---\n');

  for (const anime of animeList) {
    try {
      const data = await fetchJikan(anime.id);
      const jikanTitle = data.title_english || data.title;
      const jikanTitleJp = data.title_japanese;
      const jikanGenres = data.genres?.map(g => g.name) || [];
      const match = anime.title_en?.toLowerCase() === jikanTitle?.toLowerCase();

      console.log(`ID ${anime.id}:`);
      console.log(`  DB title_ru: ${anime.title_ru}`);
      console.log(`  DB title_en: ${anime.title_en}`);
      console.log(`  Jikan title: ${jikanTitle} / ${jikanTitleJp}`);
      console.log(`  Genres (Jikan): ${jikanGenres.join(', ')}`);
      console.log(`  Genres (DB):    ${(anime.genres || []).join(', ')}`);
      console.log(`  Match: ${match ? '✓' : '✗ MISMATCH'}`);
      console.log('');
    } catch (e) {
      console.log(`ID ${anime.id}: ERROR - ${e.message}\n`);
    }
  }
}

main().catch(console.error);
