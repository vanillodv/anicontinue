/**
 * Final comprehensive fix for wrongly-inserted anime.
 * Uses confirmed correct MAL IDs from Jikan search.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zafbjeslpkprdqaiynqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZmJqZXNscGtwcmRxYWl5bnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMwODM1MywiZXhwIjoyMDkxODg0MzUzfQ.pH-Ivl71YzyVm_W1Xn7MAO_ZFxVlWPXxKnwgNv0WTDg';
const BUCKET = 'anime-posters';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const delay = ms => new Promise(r => setTimeout(r, ms));

// IDs that were wrongly inserted by previous fix attempts — just delete them
const BAD_IDS_TO_DELETE = [
  326,   // Pet Shop of Horrors (was labeled "Союз серокрылых")
  37731, // Oh Baby Plus (was labeled "Ангел кровопролития")
  40733, // Rakshasa Street 2 (was labeled "Туалетный мальчик Ханако-кун")
  45524, // Chinese cartoon (was labeled "Скейт бесконечности")
  46569, // Hell's Paradise (was labeled "Приоритет чудо-яйца")
  53393, // Heavenly Delusion (was labeled "Лето, когда умер Хикару")
];

// Wrong DB entries still with original wrong data → delete old, insert correct
// wrongId: current ID in DB with wrong Jikan data
// correctId: real MAL ID to insert
// For wrongId=50710: has FK constraint, so we UPDATE in-place using correctId's Jikan data
const CORRECTIONS = [
  { wrongId: 1257,  correctId: 1943,  title_ru: 'Паприка',                          inPlace: false },
  { wrongId: 17483, correctId: 15037, title_ru: 'Вечеринка мёртвых: Истязаемые души', inPlace: false },
  { wrongId: 36038, correctId: 36266, title_ru: 'Сайт девочек волшебниц',            inPlace: false },
  { wrongId: 50710, correctId: 49980, title_ru: 'Сказка о сахарном яблоке',          inPlace: true  }, // FK constraint — update in-place
  { wrongId: 55789, correctId: 51553, title_ru: 'Ателье колдовских колпаков',        inPlace: false },
];

// New anime to insert fresh (correct data, no existing wrong entry)
const NEW_INSERTS = [
  { id: 387,   title_ru: 'Союз серокрылых' },
  { id: 35994, title_ru: 'Ангел кровопролития' },
  { id: 39534, title_ru: 'Туалетный мальчик Ханако-кун' },
  { id: 42923, title_ru: 'Скейт бесконечности' },
  { id: 43299, title_ru: 'Приоритет чудо-яйца' },
  { id: 58913, title_ru: 'Лето, когда умер Хикару' },
];

async function fetchJikan(id) {
  await delay(800);
  const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  if (!data) throw new Error('No data');
  return data;
}

async function uploadPoster(id, imageUrl) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return imageUrl;
    const buffer = await res.arrayBuffer();
    const ext = imageUrl.includes('.webp') ? 'webp' : 'jpg';
    const path = `${id}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
      upsert: true,
    });
    if (error) { console.error(`  Storage: ${error.message}`); return imageUrl; }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error(`  Upload error: ${e.message}`);
    return imageUrl;
  }
}

function buildRow(id, title_ru, jikanData, posterUrl) {
  return {
    id,
    title_ru,
    title_en: jikanData.title_english || jikanData.title,
    title_jp: jikanData.title_japanese,
    synopsis: jikanData.synopsis,
    genres: jikanData.genres?.map(g => g.name) || [],
    characters: [],
    poster_url: posterUrl,
    score: jikanData.score,
    year: jikanData.year || jikanData.aired?.prop?.from?.year,
    studio: jikanData.studios?.[0]?.name || null,
    episodes: jikanData.episodes,
    status: jikanData.status,
    prompt_template: null,
    ending_context: null,
    cached_at: new Date().toISOString(),
  };
}

async function deleteAnime(id) {
  const { error } = await supabase.from('anime').delete().eq('id', id);
  if (error) console.error(`  ✗ Delete ${id} failed: ${error.message}`);
  else console.log(`  ✓ Deleted ID ${id}`);
}

async function main() {
  const { data: existing } = await supabase.from('anime').select('id');
  const existingIds = new Set((existing ?? []).map(a => a.id));
  console.log(`Anime in DB: ${existingIds.size}\n`);

  // Step 1: Delete bad entries from previous failed fix
  console.log('=== Step 1: Delete bad entries from previous fix ===');
  for (const id of BAD_IDS_TO_DELETE) {
    if (!existingIds.has(id)) { console.log(`  Skip ${id} (not in DB)`); continue; }
    await deleteAnime(id);
    existingIds.delete(id);
  }

  // Step 2: Fix remaining wrong entries
  console.log('\n=== Step 2: Fix remaining wrong entries ===');
  for (const { wrongId, correctId, title_ru, inPlace } of CORRECTIONS) {
    console.log(`\n  ${title_ru} (wrong:${wrongId} → correct:${correctId})`);

    if (!existingIds.has(wrongId)) {
      console.log(`  ⏭ Wrong entry ${wrongId} not in DB, skipping`);
      continue;
    }

    // Fetch correct data
    let jikanData;
    try {
      jikanData = await fetchJikan(correctId);
      console.log(`  Jikan: "${jikanData.title_english || jikanData.title}"`);
    } catch (e) {
      console.error(`  ✗ Jikan error: ${e.message}`);
      continue;
    }

    const imageUrl = jikanData.images?.webp?.large_image_url || jikanData.images?.jpg?.large_image_url;
    const posterUrl = imageUrl ? await uploadPoster(correctId, imageUrl) : null;

    if (inPlace) {
      // Update the existing row in-place (keep wrongId, fix the content)
      // Also copy poster with wrongId filename for storage consistency
      const posterForStorage = imageUrl ? await uploadPoster(wrongId, imageUrl) : null;
      const { error } = await supabase.from('anime').update({
        title_ru,
        title_en: jikanData.title_english || jikanData.title,
        title_jp: jikanData.title_japanese,
        synopsis: jikanData.synopsis,
        genres: jikanData.genres?.map(g => g.name) || [],
        poster_url: posterForStorage || posterUrl,
        score: jikanData.score,
        year: jikanData.year || jikanData.aired?.prop?.from?.year,
        studio: jikanData.studios?.[0]?.name || null,
        episodes: jikanData.episodes,
        status: jikanData.status,
        cached_at: new Date().toISOString(),
      }).eq('id', wrongId);
      if (error) console.error(`  ✗ In-place update failed: ${error.message}`);
      else console.log(`  ✓ Updated in-place (kept ID ${wrongId})`);
    } else {
      // Insert new correct row then delete wrong one
      if (!existingIds.has(correctId)) {
        const row = buildRow(correctId, title_ru, jikanData, posterUrl);
        const { error } = await supabase.from('anime').upsert(row);
        if (error) { console.error(`  ✗ Insert ${correctId} failed: ${error.message}`); continue; }
        console.log(`  ✓ Inserted ${correctId}`);
        existingIds.add(correctId);
      } else {
        console.log(`  ⚠ ${correctId} already exists`);
      }
      await deleteAnime(wrongId);
      existingIds.delete(wrongId);
    }
  }

  // Step 3: Insert completely new anime
  console.log('\n=== Step 3: Insert new correct anime ===');
  for (const { id, title_ru } of NEW_INSERTS) {
    if (existingIds.has(id)) {
      console.log(`  ⏭ ${title_ru} (${id}) already in DB`);
      continue;
    }
    console.log(`  ➕ ${title_ru} (${id})...`);
    let jikanData;
    try {
      jikanData = await fetchJikan(id);
      console.log(`    Jikan: "${jikanData.title_english || jikanData.title}"`);
    } catch (e) {
      console.error(`    ✗ Jikan: ${e.message}`);
      continue;
    }
    const imageUrl = jikanData.images?.webp?.large_image_url || jikanData.images?.jpg?.large_image_url;
    const posterUrl = imageUrl ? await uploadPoster(id, imageUrl) : null;
    const row = buildRow(id, title_ru, jikanData, posterUrl);
    const { error } = await supabase.from('anime').upsert(row);
    if (error) console.error(`    ✗ DB error: ${error.message}`);
    else { console.log(`    ✓ Added with poster: ${posterUrl ? '✓' : '✗'}`); existingIds.add(id); }
  }

  const { data: final } = await supabase.from('anime').select('id');
  console.log(`\n✅ Done! Anime in DB: ${final?.length}`);
}

main().catch(console.error);
