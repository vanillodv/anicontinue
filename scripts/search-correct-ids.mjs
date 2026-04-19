/**
 * Search Jikan API for correct MAL IDs by anime title
 */

const delay = ms => new Promise(r => setTimeout(r, ms));

const TO_FIND = [
  { title_ru: 'Союз серокрылых',                query: 'Haibane Renmei' },
  { title_ru: 'Паприка',                         query: 'Paprika 2006' },
  { title_ru: 'Вечеринка мёртвых: Истязаемые',  query: 'Corpse Party Tortured Souls' },
  { title_ru: 'Ангел кровопролития',             query: 'Satsuriku no Tenshi' },
  { title_ru: 'Туалетный мальчик Ханако-кун',    query: 'Jibaku Shounen Hanako-kun' },
  { title_ru: 'Приоритет чудо-яйца',             query: 'Wonder Egg Priority' },
  { title_ru: 'Скейт бесконечности',             query: 'SK8 the Infinity' },
  { title_ru: 'Сказка о сахарном яблоке',        query: 'Sugar Apple Fairy Tale' },
  { title_ru: 'Ателье колдовских колпаков',      query: 'Tongari Booshi no Atelier' },
  { title_ru: 'Лето, когда умер Хикару',         query: 'Hikaru ga Shinda Natsu' },
  { title_ru: 'Сайт девочек волшебниц',          query: 'Mahou Shoujo Site' },
];

async function search(query) {
  await delay(700);
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5&sfw=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  return data || [];
}

async function main() {
  console.log('Searching Jikan for correct MAL IDs...\n');

  for (const { title_ru, query } of TO_FIND) {
    console.log(`🔍 ${title_ru} (query: "${query}")`);
    try {
      const results = await search(query);
      if (results.length === 0) {
        console.log('  No results found\n');
        continue;
      }
      for (const r of results.slice(0, 3)) {
        console.log(`  ID ${r.mal_id}: "${r.title_english || r.title}" / "${r.title_japanese}" (${r.type}, ${r.year ?? r.aired?.prop?.from?.year ?? '?'})`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    console.log('');
  }
}

main().catch(console.error);
