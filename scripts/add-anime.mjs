import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zafbjeslpkprdqaiynqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZmJqZXNscGtwcmRxYWl5bnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMwODM1MywiZXhwIjoyMDkxODg0MzUzfQ.pH-Ivl71YzyVm_W1Xn7MAO_ZFxVlWPXxKnwgNv0WTDg';
const BUCKET = 'anime-posters';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const delay = ms => new Promise(r => setTimeout(r, ms));

// MAL IDs for each anime (pre-resolved)
const ANIME_TO_ADD = [
  { id: 226,   title_ru: 'Эльфийская песнь' },
  { id: 399,   title_ru: 'Союз серокрылых' },
  { id: 339,   title_ru: 'Эксперименты Лэйн' },
  { id: 790,   title_ru: 'Эрго Прокси' },
  { id: 40787, title_ru: 'Приоритет чудо-яйца' },
  { id: 36038, title_ru: 'Сайт девочек волшебниц' },
  { id: 9756,  title_ru: 'Мадока Магика' },
  { id: 58426, title_ru: 'Лето, когда умер Хикару' },
  { id: 934,   title_ru: 'Когда плачут цикады' },
  { id: 1257,  title_ru: 'Паприка' },
  { id: 2951,  title_ru: 'Истинная грусть' },
  { id: 50710, title_ru: 'Сказка о сахарном яблоке' },
  { id: 40747, title_ru: 'Туалетный мальчик Ханако-кун' },
  { id: 45796, title_ru: 'Скейт бесконечности' },
  { id: 28999, title_ru: 'Шарлотта' },
  { id: 35839, title_ru: 'Ангел кровопролития' },
  { id: 5680,  title_ru: 'Кэйон!' },
  { id: 813,   title_ru: 'Меланхолия Харухи Судзумии' },
  { id: 2476,  title_ru: 'Школьные дни' },
  { id: 17483, title_ru: 'Вечеринка мёртвых: Истязаемые души' },
  { id: 55789, title_ru: 'Ателье колдовских колпаков' },
];

async function fetchJikan(id) {
  await delay(600);
  const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Jikan ${id}: ${res.status}`);
  const { data } = await res.json();
  return data;
}

async function uploadPoster(id, imageUrl) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return imageUrl; // fallback to original
    const buffer = await res.arrayBuffer();
    const ext = imageUrl.includes('.webp') ? 'webp' : 'jpg';
    const path = `${id}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
      upsert: true,
    });
    if (error) return imageUrl;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return imageUrl;
  }
}

async function main() {
  // Get existing IDs
  const { data: existing } = await supabase.from('anime').select('id');
  const existingIds = new Set((existing ?? []).map(a => a.id));
  console.log(`Existing anime in DB: ${existingIds.size}\n`);

  let added = 0;
  let skipped = 0;

  for (const { id, title_ru } of ANIME_TO_ADD) {
    if (existingIds.has(id)) {
      console.log(`⏭  Already exists: ${title_ru} (${id})`);
      skipped++;
      continue;
    }

    console.log(`➕ Adding: ${title_ru} (${id})...`);
    let data;
    try {
      data = await fetchJikan(id);
    } catch (e) {
      console.log(`  ✗ Jikan error: ${e.message}`);
      continue;
    }

    const imageUrl = data.images?.webp?.large_image_url || data.images?.jpg?.large_image_url;
    const posterUrl = imageUrl ? await uploadPoster(id, imageUrl) : null;

    const row = {
      id,
      title_ru,
      title_en: data.title_english || data.title,
      title_jp: data.title_japanese,
      synopsis: data.synopsis,
      genres: data.genres?.map(g => g.name) || [],
      characters: [],
      poster_url: posterUrl,
      score: data.score,
      year: data.year || data.aired?.prop?.from?.year,
      studio: data.studios?.[0]?.name || null,
      episodes: data.episodes,
      status: data.status,
      prompt_template: null,
      ending_context: null,
      cached_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('anime').upsert(row);
    if (error) {
      console.log(`  ✗ DB error: ${error.message}`);
    } else {
      console.log(`  ✓ Added with poster: ${posterUrl ? '✓' : '✗'}`);
      added++;
    }
  }

  console.log(`\n✅ Done. Added: ${added}, Skipped (already exist): ${skipped}`);
}

main().catch(console.error);
