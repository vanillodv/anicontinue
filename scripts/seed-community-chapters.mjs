#!/usr/bin/env node
/**
 * Наполнение community демо-контентом.
 * Создаёт 10 demo-авторов и ~30 публичных глав по разным тайтлам.
 *
 * Запуск:
 *   ANTHROPIC_API_KEY=sk-ant-... \
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-community-chapters.mjs
 *
 * Что делает:
 * 1. Идемпотентно создаёт 10 demo-юзеров (если email уже есть — находит существующего)
 * 2. Повышает им лимит до 999 (чтобы не упираться)
 * 3. Для каждой задачи в SEEDS — генерирует главу через Claude с активным
 *    system_prompt из ai_prompts + prompt_template тайтла (если есть)
 * 4. Вставляет в chapters с is_public=true
 *
 * Стоимость: ~$0.18 за 30 глав, ~12 минут генерации.
 *
 * Идемпотентность:
 * - Авторы не дублируются (create_or_find по email)
 * - Главы привязываются к пользователю+аниме+времени. Если скрипт запустить 2 раза,
 *   будет 60 глав. Чтобы перезапустить без дублирования — удалите chapters
 *   где user_id in (...demo ids...) вручную.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("⨯ Нужны env: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!/^sk-ant-[A-Za-z0-9_\-]{50,}$/.test(ANTHROPIC_API_KEY)) {
  console.error("⨯ ANTHROPIC_API_KEY не валиден"); process.exit(1);
}
if (!/^eyJ[A-Za-z0-9_\-.]{150,}$/.test(SUPABASE_SERVICE_KEY)) {
  console.error("⨯ SUPABASE_SERVICE_ROLE_KEY не валиден"); process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════
// DEMO АВТОРЫ (10 штук, разные вайбы)
// ═══════════════════════════════════════════════════════════════════
const DEMO_AUTHORS = [
  { email: "seed.aki@anicontinue-demo.local",       username: "aki writer" },
  { email: "seed.shipper@anicontinue-demo.local",   username: "ShipperSoul" },
  { email: "seed.ghibli@anicontinue-demo.local",    username: "Ghibli Soul" },
  { email: "seed.midnight@anicontinue-demo.local",  username: "Midnight Ronin" },
  { email: "seed.kyoko@anicontinue-demo.local",     username: "Kyoko Dreams" },
  { email: "seed.paper@anicontinue-demo.local",     username: "Paper Lantern" },
  { email: "seed.frame@anicontinue-demo.local",     username: "Frame of Mind" },
  { email: "seed.ronin@anicontinue-demo.local",     username: "Blue Moon" },
  { email: "seed.otaku@anicontinue-demo.local",     username: "Otaku 2099" },
  { email: "seed.canon@anicontinue-demo.local",     username: "Canon Rewriter" },
];

// ═══════════════════════════════════════════════════════════════════
// ЗАДАЧИ ДЛЯ ГЕНЕРАЦИИ (30 штук, разные тайтлы + моды + сцены)
// ═══════════════════════════════════════════════════════════════════
const SEEDS = [
  // Атака Титанов (16498) — экшн/драма сильные
  { animeId: 16498, mood: "Драма",     sceneType: "continuation", sp: "Три года после последней битвы. Армин читает письмо, которого не должен был получить." },
  { animeId: 16498, mood: "Экшн",      sceneType: "alternative",  sp: "А что если Ливай успел вовремя. Одна секунда меняет всё." },
  { animeId: 16498, mood: "Романтика", sceneType: "continuation", sp: "Жан и Микаса встречаются у могилы — спустя годы после того как всё закончилось." },

  // Стальной алхимик: Братство (5114) — драма/приключения
  { animeId: 5114,  mood: "Драма",     sceneType: "continuation", sp: "Эд приехал в Ризембул в снегопад. Уинри не узнала его с порога." },
  { animeId: 5114,  mood: "Юмор",      sceneType: "continuation", sp: "Ал пытается приготовить ужин впервые своими руками." },

  // Охотник × Охотник (11061)
  { animeId: 11061, mood: "Драма",     sceneType: "continuation", sp: "Письмо от Джина доходит до Гона через три года." },
  { animeId: 11061, mood: "Экшн",      sceneType: "alternative",  sp: "Киллуа не ушёл в арку Убийц. Он остался рядом в тот день." },

  // Врата Штейна (9253)
  { animeId: 9253,  mood: "Драма",     sceneType: "alternative",  sp: "Окабэ пробуждается на мировой линии, которой быть не должно." },
  { animeId: 9253,  mood: "Романтика", sceneType: "continuation", sp: "Курису и Окабэ встречаются в CERN два года спустя." },

  // Форма голоса (28851)
  { animeId: 28851, mood: "Драма",     sceneType: "continuation", sp: "Сёя и Сёко на мосту, с которого началось. Прошёл год." },
  { animeId: 28851, mood: "Романтика", sceneType: "continuation", sp: "Первая настоящая ссора — без слов, только жестами." },

  // Кланнад: Продолжение (4181)
  { animeId: 4181,  mood: "Драма",     sceneType: "continuation", sp: "Томоя учит Ушио завязывать шнурки — впервые вдвоём." },
  { animeId: 4181,  mood: "Романтика", sceneType: "alternative",  sp: "Нагиса выжила. Первый обычный вечер в их новой квартире." },

  // Твоё имя (32281)
  { animeId: 32281, mood: "Романтика", sceneType: "continuation", sp: "Спустя полгода после встречи на лестнице. Они забывают имена друг друга снова." },

  // Унесённые призраками (199)
  { animeId: 199,   mood: "Драма",     sceneType: "continuation", sp: "Тихиро, 16 лет. Во сне она опять слышит шум реки Кохаку." },

  // Первый шаг (263)
  { animeId: 263,   mood: "Драма",     sceneType: "continuation", sp: "Ипо в углу ринга между раундами. Камогава не говорит ни слова." },

  // Ван-Пис (21)
  { animeId: 21,    mood: "Экшн",      sceneType: "continuation", sp: "Луффи и Зоро просыпаются на незнакомом острове. Корабля нигде не видно." },
  { animeId: 21,    mood: "Юмор",      sceneType: "continuation", sp: "Санджи готовит завтрак на шестерых. Усопп врёт, что съел чужую порцию." },

  // Наруто (20 — если в БД)
  { animeId: 20,    mood: "Драма",     sceneType: "continuation", sp: "Саске возвращается в Коноху. Сакура видит его первой — у старых ворот." },

  // Код Гиас (1575)
  { animeId: 1575,  mood: "Драма",     sceneType: "alternative",  sp: "А что если Эйфория не взорвалась. Лелуш и Сузаку в одной комнате после." },

  // Волейбол (20583 или другой id — не точно, используем поиск)
  { animeId: 32935, mood: "Драма",     sceneType: "continuation", sp: "Последний матч Карасуно. Хината на скамейке запасных — впервые за три года." },

  // Токийский гуль (22319)
  { animeId: 22319, mood: "Драма",     sceneType: "alternative",  sp: "Канеки просыпается раньше операции. Выбор, которого не было." },

  // Одинокий скиталец (Monster, 19)
  { animeId: 19,    mood: "Драма",     sceneType: "continuation", sp: "Тенма в клинике Дюссельдорфа. Пациент, которого он не может узнать." },

  // Вайолет Эвергарден (33352)
  { animeId: 33352, mood: "Романтика", sceneType: "continuation", sp: "Письмо, которое Вайолет писала всю зиму. Оно не нашло адресата." },

  // Сага о Винланде (37521)
  { animeId: 37521, mood: "Драма",     sceneType: "continuation", sp: "Торфинн на краю поля. Впервые за жизнь он не хочет драться." },

  // Дневник аптекаря (54492)
  { animeId: 54492, mood: "Драма",     sceneType: "continuation", sp: "Маомао находит новый яд в подаренном чае. Он адресован не ей." },

  // Фриерен (52991)
  { animeId: 52991, mood: "Драма",     sceneType: "continuation", sp: "Фриерен листает записи Химмеля — те, что он прятал от неё." },

  // Кагуя-сама (43608)
  { animeId: 43608, mood: "Юмор",      sceneType: "continuation", sp: "Сироганэ пытается признаться. План 47 из 50 уже провалился." },

  // Ателье колдовских колпаков (51553)
  { animeId: 51553, mood: "Драма",     sceneType: "continuation", sp: "Коко теряет заклинание посреди ярмарки ведьм. Тифа видит это первой." },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// Supabase admin REST
// ═══════════════════════════════════════════════════════════════════
async function db(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DB ${res.status}: ${t.slice(0, 300)}`);
  }
  return res;
}

async function authAdmin(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Auth ${res.status}: ${t.slice(0, 300)}`);
  }
  return res;
}

// Найти или создать demo-юзера, вернуть его uuid
async function ensureAuthor({ email, username }) {
  // Пробуем найти
  const listRes = await authAdmin(`/admin/users?email=${encodeURIComponent(email)}`);
  const listData = await listRes.json();
  let user = (listData.users || []).find(u => u.email === email);

  if (!user) {
    // Создаём
    const createRes = await authAdmin("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + "Ax!",
        user_metadata: { full_name: username, seed: true },
      }),
    });
    user = await createRes.json();
  }

  // Профиль (upsert)
  const profRes = await db(`/profiles?id=eq.${user.id}&select=id`);
  const existing = await profRes.json();
  if (existing.length === 0) {
    await db("/profiles", {
      method: "POST",
      body: JSON.stringify({
        id: user.id,
        username,
        plan: "free",
        chapters_used: 0,
        chapters_limit: 999,
      }),
    });
  } else {
    // Обновим username на случай если триггер прожуёт
    await db(`/profiles?id=eq.${user.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ username, chapters_limit: 999 }),
    });
  }

  return user.id;
}

// ═══════════════════════════════════════════════════════════════════
// Anthropic
// ═══════════════════════════════════════════════════════════════════
async function claude(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3500,
      temperature: 0.85,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

function parseXml(text) {
  const title = text.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || "Без названия";
  const content = text.match(/<content>([\s\S]*?)<\/content>/)?.[1]?.trim() || "";
  const summary = text.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || "";
  return {
    title: title.replace(/^[\s#*]+/, "").replace(/^[«"]/, "").replace(/[»"]$/, "").trim(),
    content: content.replace(/^\s+/, ""),
    summary: summary.replace(/^\s+/, ""),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════
(async () => {
  console.log("→ Создаю/нахожу demo-авторов...");
  const authorIds = [];
  for (const a of DEMO_AUTHORS) {
    try {
      const id = await ensureAuthor(a);
      authorIds.push(id);
      console.log(`  ✓ ${a.username} (${id.slice(0, 8)})`);
    } catch (err) {
      console.error(`  ⨯ ${a.email}:`, err.message);
    }
  }
  if (authorIds.length === 0) {
    console.error("⨯ Не удалось создать ни одного автора"); process.exit(1);
  }

  console.log("\n→ Тяну активный system_prompt...");
  const promptRes = await db("/ai_prompts?is_active=eq.true&select=system_prompt&limit=1");
  const [{ system_prompt }] = await promptRes.json();
  console.log(`  Длина: ${system_prompt.length} символов`);

  console.log(`\n→ Генерирую ${SEEDS.length} глав...`);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < SEEDS.length; i++) {
    const seed = SEEDS[i];
    const userId = authorIds[i % authorIds.length];

    try {
      // Тянем аниме
      const animeRes = await db(`/anime?id=eq.${seed.animeId}&select=title_ru,title_en,synopsis,year,studio,genres,prompt_template,ending_context`);
      const animeArr = await animeRes.json();
      const anime = animeArr[0];
      if (!anime) {
        console.log(`  ${i+1}/${SEEDS.length} ⨯ anime id ${seed.animeId} не найден`);
        fail++;
        continue;
      }
      const title = anime.title_ru || anime.title_en;

      // Формируем user-prompt для Claude
      const curated = anime.prompt_template ? `\n\nКУРИРОВАННЫЕ ЗНАНИЯ О ТАЙТЛЕ:\n${anime.prompt_template}` : "";
      const ending = anime.ending_context || "";
      const moodDesc = {
        "Экшн": "динамичная экшн-сцена с конфликтом",
        "Драма": "эмоциональная драматическая сцена",
        "Романтика": "романтическая сцена с чувствами между героями",
        "Юмор": "лёгкая комедийная сцена",
      }[seed.mood] || seed.mood;
      const typeNote = seed.sceneType === "alternative"
        ? "Это АЛЬТЕРНАТИВНАЯ концовка — события пошли иначе, чем в каноне."
        : "Это ПРЯМОЕ ПРОДОЛЖЕНИЕ канона.";

      const userPrompt = `Напиши главу фанфика.

АНИМЕ: ${title}${anime.title_en && anime.title_en !== title ? ` / ${anime.title_en}` : ""}
Год/Студия: ${anime.year || "—"}, ${anime.studio || "—"}

СЮЖЕТ ОРИГИНАЛА:
${(anime.synopsis || "").slice(0, 800)}
${curated}
${ending ? `\nФИНАЛ ОРИГИНАЛА:\n${ending}` : ""}

ТРЕБОВАНИЯ:
• Настроение: ${moodDesc}
• ${typeNote}
• Начало сцены: ${seed.sp}

Пиши по правилам system-промпта. Формат XML. Объём 2000-2500 слов.`;

      const text = await claude(system_prompt, userPrompt);
      const { title: chTitle, content, summary } = parseXml(text);

      if (content.length < 500) {
        console.log(`  ${i+1}/${SEEDS.length} ⨯ ${title}: контент слишком короткий (${content.length} chars)`);
        fail++;
        continue;
      }

      // Вставляем главу
      await db("/chapters", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: userId,
          anime_id: seed.animeId,
          title: chTitle,
          content,
          summary,
          scene_params: {
            mood: seed.mood,
            sceneType: seed.sceneType,
            startingPoint: seed.sp,
          },
          is_public: true,
          is_deleted: false,
        }),
      });

      console.log(`  ${i+1}/${SEEDS.length} ✓ ${title} · ${seed.mood} · "${chTitle}" (${content.length} chars)`);
      ok++;
    } catch (err) {
      console.error(`  ${i+1}/${SEEDS.length} ⨯ anime ${seed.animeId}: ${err.message}`);
      fail++;
    }
    // Пауза между Claude-вызовами
    await sleep(1000);
  }

  console.log(`\n✓ Готово. Создано: ${ok}. Ошибок: ${fail}.`);
})();
