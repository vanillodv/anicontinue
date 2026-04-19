/**
 * Fix script for wrongly-inserted anime.
 *
 * Problem: add-anime.mjs used wrong MAL IDs, so Jikan returned data for
 * different anime. This script:
 *  1. Verifies proposed correct IDs via Jikan
 *  2. Deletes wrongly-inserted rows
 *  3. Inserts correct rows with proper data + posters
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zafbjeslpkprdqaiynqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZmJqZXNscGtwcmRxYWl5bnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMwODM1MywiZXhwIjoyMDkxODg0MzUzfQ.pH-Ivl71YzyVm_W1Xn7MAO_ZFxVlWPXxKnwgNv0WTDg';
const BUCKET = 'anime-posters';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const delay = ms => new Promise(r => setTimeout(r, ms));

// wrongId -> { correctId, title_ru }
// wrongId is what's currently in the DB (wrong anime data stored under it)
// correctId is the real MAL ID for that anime
const CORRECTIONS = [
  { wrongId: 399,   correctId: 326,   title_ru: 'Союз серокрылых' },         // Haibane Renmei
  { wrongId: 1257,  correctId: 2381,  title_ru: 'Паприка' },                  // Paprika (Satoshi Kon 2006)
  // 2951 "Истинная грусть" - unclear what anime this is, removing it
  { wrongId: 2951,  correctId: null,  title_ru: 'Истинная грусть' },
  { wrongId: 17483, correctId: 19643, title_ru: 'Вечеринка мёртвых: Истязаемые души' }, // Corpse Party
  { wrongId: 35839, correctId: 37731, title_ru: 'Ангел кровопролития' },      // Angels of Death
  { wrongId: 40747, correctId: 40733, title_ru: 'Туалетный мальчик Ханако-кун' }, // Hanako-kun
  { wrongId: 40787, correctId: 46569, title_ru: 'Приоритет чудо-яйца' },     // Wonder Egg Priority
  { wrongId: 45796, correctId: 45524, title_ru: 'Скейт бесконечности' },     // SK8 the Infinity
  { wrongId: 50710, correctId: 51961, title_ru: 'Сказка о сахарном яблоке' }, // Sugar Apple Fairy Tale
  { wrongId: 55789, correctId: 54951, title_ru: 'Ателье колдовских колпаков' }, // Tongari Booshi
  { wrongId: 58426, correctId: 53393, title_ru: 'Лето, когда умер Хикару' }, // Hikaru ga Shinda Natsu
];

async function fetchJikan(id) {
  await delay(700);
  const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Jikan ${id}: HTTP ${res.status}`);
  const { data } = await res.json();
  if (!data) throw new Error(`Jikan ${id}: no data`);
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
    if (error) { console.error(`  Storage error: ${error.message}`); return imageUrl; }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error(`  Upload failed: ${e.message}`);
    return imageUrl;
  }
}

async function main() {
  const { data: existing } = await supabase.from('anime').select('id');
  const existingIds = new Set((existing ?? []).map(a => a.id));

  console.log(`Anime in DB: ${existingIds.size}\n`);

  for (const { wrongId, correctId, title_ru } of CORRECTIONS) {
    console.log(`\n--- ${title_ru} ---`);
    console.log(`  Wrong ID in DB: ${wrongId} → Correct ID: ${correctId ?? 'DELETE ONLY'}`);

    if (correctId === null) {
      // Just delete — we don't know the correct ID
      const { error } = await supabase.from('anime').delete().eq('id', wrongId);
      if (error) console.error(`  ✗ Delete failed: ${error.message}`);
      else console.log(`  ✓ Deleted unknown entry (${wrongId})`);
      continue;
    }

    // Check if correct ID already exists
    if (existingIds.has(correctId)) {
      console.log(`  ⚠ Correct ID ${correctId} already in DB — just deleting wrong entry`);
      const { error } = await supabase.from('anime').delete().eq('id', wrongId);
      if (error) console.error(`  ✗ Delete failed: ${error.message}`);
      else console.log(`  ✓ Deleted wrong entry (${wrongId})`);
      continue;
    }

    // Fetch correct data from Jikan
    let data;
    try {
      data = await fetchJikan(correctId);
    } catch (e) {
      console.error(`  ✗ Jikan error: ${e.message}`);
      continue;
    }

    console.log(`  Jikan says: "${data.title_english || data.title}" / "${data.title_japanese}"`);

    // Upload poster
    const imageUrl = data.images?.webp?.large_image_url || data.images?.jpg?.large_image_url;
    const posterUrl = imageUrl ? await uploadPoster(correctId, imageUrl) : null;

    // Build new row
    const row = {
      id: correctId,
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

    // Insert correct entry
    const { error: insertError } = await supabase.from('anime').upsert(row);
    if (insertError) {
      console.error(`  ✗ Insert failed: ${insertError.message}`);
      continue;
    }
    console.log(`  ✓ Inserted correct entry (${correctId}) with poster: ${posterUrl ? '✓' : '✗'}`);

    // Delete wrong entry
    const { error: deleteError } = await supabase.from('anime').delete().eq('id', wrongId);
    if (deleteError) console.error(`  ✗ Delete wrong entry failed: ${deleteError.message}`);
    else console.log(`  ✓ Deleted wrong entry (${wrongId})`);

    existingIds.add(correctId);
    existingIds.delete(wrongId);
  }

  console.log('\n✅ Fix complete!');
}

main().catch(console.error);
