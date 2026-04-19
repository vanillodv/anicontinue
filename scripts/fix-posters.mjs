import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zafbjeslpkprdqaiynqs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZmJqZXNscGtwcmRxYWl5bnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMwODM1MywiZXhwIjoyMDkxODg0MzUzfQ.pH-Ivl71YzyVm_W1Xn7MAO_ZFxVlWPXxKnwgNv0WTDg';
const BUCKET = 'anime-posters';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchJikanPoster(malId) {
  try {
    await delay(500);
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data?.images?.webp?.large_image_url || data?.images?.jpg?.large_image_url || null;
  } catch {
    return null;
  }
}

async function uploadToStorage(malId, imageUrl) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const ext = imageUrl.includes('.webp') ? 'webp' : 'jpg';
    const path = `${malId}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg',
        upsert: true,
      });

    if (error) { console.error(`  Storage error:`, error.message); return null; }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error(`  Upload failed:`, e.message);
    return null;
  }
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Cannot create bucket: ${error.message}`);
    console.log(`✓ Bucket "${BUCKET}" created`);
  } else {
    console.log(`✓ Bucket "${BUCKET}" exists`);
  }
}

async function main() {
  console.log('🔍 Fetching all anime from DB...');
  const { data: animeList, error } = await supabase.from('anime').select('id, title_ru, title_en, poster_url');
  if (error) throw error;

  console.log(`Found ${animeList.length} anime\n`);
  await ensureBucket();

  let fixed = 0;
  let skipped = 0;

  for (const anime of animeList) {
    const name = anime.title_ru || anime.title_en || `id:${anime.id}`;

    // Check if current URL works
    const urlOk = anime.poster_url ? await checkUrl(anime.poster_url) : false;
    if (urlOk) {
      console.log(`✓ OK: ${name}`);
      skipped++;
      continue;
    }

    console.log(`✗ Broken: ${name} — fetching from Jikan...`);

    // Get fresh URL from Jikan
    const freshUrl = await fetchJikanPoster(anime.id);
    if (!freshUrl) {
      console.log(`  ⚠ Jikan returned no image, skipping`);
      continue;
    }

    // Upload to Supabase Storage
    console.log(`  Uploading...`);
    const publicUrl = await uploadToStorage(anime.id, freshUrl);
    if (!publicUrl) continue;

    // Update DB
    const { error: updateError } = await supabase
      .from('anime')
      .update({ poster_url: publicUrl })
      .eq('id', anime.id);

    if (updateError) {
      console.error(`  DB update failed: ${updateError.message}`);
    } else {
      console.log(`  ✓ Fixed: ${publicUrl}`);
      fixed++;
    }

    await delay(300);
  }

  console.log(`\n✅ Done. Fixed: ${fixed}, Already OK: ${skipped}`);
}

main().catch(console.error);
