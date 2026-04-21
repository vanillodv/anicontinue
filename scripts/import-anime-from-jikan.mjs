#!/usr/bin/env node
/**
 * Массовый импорт топ-аниме в каталог AniContinue через Jikan API
 * (публичный REST-wrapper над MyAnimeList, не требует auth-ключа).
 *
 * Docs: https://docs.api.jikan.moe/
 *
 * Запуск:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-anime-from-jikan.mjs
 *
 * Можно получить URL/key из Vercel env или из Supabase Dashboard → Project Settings → API.
 * Service role нужен чтобы обойти RLS на public.anime (там ограничено на чтение всем,
 * а запись — только admin, но через service role всё работает).
 *
 * Что делает:
 * 1. Тянет 10 страниц top-anime с Jikan (по 25 на странице = до 250 тайтлов)
 * 2. Для каждого проверяет: уже есть в БД по MAL ID? Если да — пропускает.
 * 3. Upsert'ит новые с полями title_ru (где нет — латинизация title_en), title_en,
 *    title_jp, synopsis, genres, score, year, studio, episodes, status, poster_url
 * 4. Уважает Jikan rate limit (3 req/sec, 60 req/min) — добавляет паузы.
 *
 * Безопасность:
 * - НЕ затрагивает существующие записи (только insert новых).
 * - prompt_template, ending_context не перезаписываются — они ручные.
 * - При ошибке одного тайтла — пропускает и продолжает.
 */

const JIKAN = "https://api.jikan.moe/v4";
const PAGES = 10;               // 10 страниц × 25 = 250 тайтлов максимум
const PER_PAGE_DELAY = 1100;    // ms между страницами, ниже rate-limit Jikan

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("⨯ Нужны env-переменные NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Ранняя валидация: service_role key — это JWT, должен начинаться с eyJ.
if (!/^eyJ[A-Za-z0-9_\-.]{30,}$/.test(SUPABASE_SERVICE_KEY)) {
  console.error("⨯ SUPABASE_SERVICE_ROLE_KEY не похож на JWT.");
  console.error("  Скопируйте значение из Vercel → Settings → Env Variables");
  console.error("  (или из Supabase Dashboard → Project Settings → API → service_role).");
  console.error("  Ключ должен начинаться на 'eyJhbGc...' и быть длиной ~200+ символов.");
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Тонкий клиент Supabase REST (fetch, без SDK)
async function dbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}

// Получить уже существующие MAL id из БД (чтобы не дублировать)
async function fetchExistingIds() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=id`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const rows = await res.json();
  return new Set(rows.map(r => r.id));
}

// Retry с back-off. Jikan из РФ иногда роняется (terminated/fetch failed).
async function fetchJikanPage(page, attempt = 1) {
  const url = `${JIKAN}/top/anime?page=${page}&type=tv&filter=bypopularity`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000), // 15s на запрос
      headers: { "User-Agent": "AniContinue-Import/1.0" },
    });
    if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    if (attempt >= 4) throw err; // 4 попытки (1 + 3 retry)
    const delay = 2000 * attempt; // 2s, 4s, 6s
    console.log(`    ↻ retry ${attempt}/3 через ${delay}ms (${err.message})`);
    await sleep(delay);
    return fetchJikanPage(page, attempt + 1);
  }
}

function mapJikan(a) {
  // title_ru — нет в Jikan. Оставим title_en как fallback для новых.
  // Админ в /admin/anime сможет позже перевести вручную.
  const title_en = a.title_english || a.title || null;
  const title_jp = a.title_japanese || a.titles?.find(t => t.type === "Japanese")?.title || null;
  const title_ru = null; // заполнить вручную через админку

  // genres[]
  const genres = (a.genres || []).map(g => g.name);

  const poster_url = a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || null;

  return {
    id: a.mal_id,
    title_ru,
    title_en,
    title_jp,
    synopsis: a.synopsis || null,
    genres,
    score: a.score || null,
    year: a.year || a.aired?.prop?.from?.year || null,
    studio: (a.studios || [])[0]?.name || null,
    episodes: a.episodes || null,
    status: a.status || null,
    poster_url,
  };
}

async function insertBatch(rows) {
  if (rows.length === 0) return;
  await dbFetch("/anime", {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

(async () => {
  console.log("→ Загрузка списка уже импортированных тайтлов...");
  const existing = await fetchExistingIds();
  console.log(`  В БД уже: ${existing.size}`);

  let totalNew = 0;
  let totalErrors = 0;

  for (let page = 1; page <= PAGES; page++) {
    try {
      console.log(`→ Jikan страница ${page}/${PAGES}...`);
      const items = await fetchJikanPage(page);
      const toInsert = items
        .map(mapJikan)
        .filter(a => !existing.has(a.id));

      if (toInsert.length === 0) {
        console.log(`  страница ${page}: все уже есть`);
      } else {
        console.log(`  страница ${page}: новых ${toInsert.length}`);
        // batch по 20 чтобы не упереться в лимит PostgREST
        for (let i = 0; i < toInsert.length; i += 20) {
          const chunk = toInsert.slice(i, i + 20);
          try {
            await insertBatch(chunk);
            chunk.forEach(a => existing.add(a.id));
            totalNew += chunk.length;
          } catch (err) {
            console.error(`    ⨯ batch error:`, err.message);
            totalErrors += chunk.length;
          }
        }
      }
    } catch (err) {
      console.error(`  ⨯ страница ${page}: ${err.message}`);
    }
    // Jikan rate limit
    if (page < PAGES) await sleep(PER_PAGE_DELAY);
  }

  console.log(`\n✓ Готово. Добавлено новых: ${totalNew}. Ошибок: ${totalErrors}.`);
  console.log(`  Теперь в БД: ${existing.size} тайтлов.`);
  console.log(`\nСледующий шаг: зайти в /admin/anime и вручную перевести title_ru для новых`);
  console.log(`(либо запустить LLM-скрипт позже).`);
})();
