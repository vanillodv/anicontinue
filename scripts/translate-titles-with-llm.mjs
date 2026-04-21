#!/usr/bin/env node
/**
 * Автоперевод title_ru для аниме, у которых он NULL.
 * Использует Claude Haiku через Anthropic API (дёшево, быстро).
 *
 * Запуск:
 *   ANTHROPIC_API_KEY=sk-ant-... \
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/translate-titles-with-llm.mjs
 *
 * Что делает:
 * 1. Находит все anime WHERE title_ru IS NULL
 * 2. Бьёт на батчи по 20 и отправляет в Claude — получает JSON-массив переводов
 * 3. Обновляет БД батчами
 *
 * Безопасность:
 * - Не трогает существующие title_ru (только NULL)
 * - Использует официальные русские названия если известны (Атака Титанов, Кланнад)
 * - Для неизвестных — транслит + перевод смысла
 *
 * Стоимость:
 * - Haiku: ~$0.25 за млн input токенов, ~$1.25 за млн output
 * - 100 тайтлов = ~5k input + 2k output = $0.004. Почти бесплатно.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("⨯ Нужны env: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!/^sk-ant-[A-Za-z0-9_\-]{50,}$/.test(ANTHROPIC_API_KEY)) {
  console.error("⨯ ANTHROPIC_API_KEY не валиден.");
  console.error("  Реальный ключ: sk-ant-api03-XXXXXX... (длиной ~100 символов)");
  console.error("  Возьмите из Vercel → Settings → Env Variables → ANTHROPIC_API_KEY → Decrypt");
  process.exit(1);
}
if (!/^eyJ[A-Za-z0-9_\-.]{150,}$/.test(SUPABASE_SERVICE_KEY)) {
  console.error("⨯ SUPABASE_SERVICE_ROLE_KEY не валиден.");
  console.error("  Реальный ключ: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs... (~200+ символов)");
  console.error("  Возьмите из Vercel → Settings → Env Variables → SUPABASE_SERVICE_ROLE_KEY → Decrypt");
  process.exit(1);
}

const BATCH_SIZE = 20;

async function dbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`DB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function fetchMissingTitles() {
  const res = await dbFetch("/anime?title_ru=is.null&select=id,title_en,title_jp&limit=500");
  return res.json();
}

async function askClaude(batch) {
  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: `Ты переводишь названия аниме на русский. Правила:

1) Используй ОФИЦИАЛЬНОЕ русское название, если оно широко известно:
   - Attack on Titan → «Атака Титанов»
   - Fullmetal Alchemist → «Стальной алхимик»
   - One Piece → «Ван-Пис»
   - Clannad After Story → «Кланнад: Продолжение»
   - Spirited Away → «Унесённые призраками»
   - Your Name → «Твоё имя»
   - Naruto → «Наруто»
   - Death Note → «Тетрадь смерти»
   - Hunter x Hunter → «Охотник × Охотник»

2) Пиши с буквой «ё» где она нужна (Твоё, не Твое; Унесённые, не Унесенные).

3) Если название — собственное имя (Наруто, Кёко), транслитерируй.

4) Если название описательное ("A Silent Voice"), переведи смысл («Форма голоса»).

5) Не добавляй комментариев. Только JSON-массив.

Формат ответа — СТРОГО JSON-массив, без markdown-блоков, без комментариев:
[{"id": 123, "title_ru": "Название"}, ...]`,
    messages: [
      {
        role: "user",
        content: `Переведи эти названия аниме на русский:\n\n${batch.map(a => `id ${a.id}: EN="${a.title_en || ""}" JP="${a.title_jp || ""}"`).join("\n")}`,
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  // Иногда модель всё же оборачивает в ```json. Снимаем.
  const clean = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON.parse(clean);
}

async function updateTitle(id, title_ru) {
  await dbFetch(`/anime?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({ title_ru }),
  });
}

(async () => {
  console.log("→ Ищу аниме без title_ru...");
  const missing = await fetchMissingTitles();
  console.log(`  Найдено: ${missing.length}`);

  if (missing.length === 0) {
    console.log("✓ Все тайтлы уже переведены.");
    return;
  }

  let translated = 0;
  let errors = 0;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const idx = `${i + 1}-${Math.min(i + BATCH_SIZE, missing.length)}`;
    try {
      console.log(`→ Claude батч ${idx} из ${missing.length}...`);
      const translations = await askClaude(batch);
      // Сохраняем по одному, чтобы единичная ошибка не срывала батч
      for (const t of translations) {
        if (!t.id || !t.title_ru) continue;
        try {
          await updateTitle(t.id, t.title_ru);
          translated++;
        } catch (err) {
          console.error(`    ⨯ id ${t.id}:`, err.message);
          errors++;
        }
      }
      console.log(`  ✓ применено: ${translations.length}`);
    } catch (err) {
      console.error(`  ⨯ батч ${idx}:`, err.message);
      errors += batch.length;
    }
    // Anthropic rate limit — 50 req/min в Tier 1, с запасом
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n✓ Переведено: ${translated}. Ошибок: ${errors}.`);
})();
