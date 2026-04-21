#!/usr/bin/env node
/**
 * Автоперевод synopsis для аниме, у которых он на английском.
 * Использует Claude Haiku 4.5.
 *
 * Запуск:
 *   ANTHROPIC_API_KEY=sk-ant-... \
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/translate-synopsis-with-llm.mjs
 *
 * Что делает:
 * 1. Находит anime WHERE synopsis IS NOT NULL AND нет кириллицы (rudimentary detect)
 * 2. Бьёт на батчи по 5 (synopsis длинный, 1 штука = ~300 токенов output)
 * 3. Перезаписывает synopsis русским переводом
 *
 * Безопасность:
 * - НЕ трогает уже русские (проверка на кириллицу)
 * - При ошибке батча — пропускает, идёт дальше
 * - Сохраняет канонические имена (Kaguya → Кагуя, Shirogane → Сироганэ)
 *
 * Стоимость:
 * - Haiku 4.5: ~$0.25 / M input, ~$1.25 / M output
 * - 100 synopsis × ~400 tokens out ≈ 40k output ≈ $0.05. Дёшево.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("⨯ Нужны env: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!/^sk-ant-[A-Za-z0-9_\-]{50,}$/.test(ANTHROPIC_API_KEY)) {
  console.error("⨯ ANTHROPIC_API_KEY не валиден (должен начинаться на sk-ant- и быть ~100 символов).");
  process.exit(1);
}
if (!/^eyJ[A-Za-z0-9_\-.]{150,}$/.test(SUPABASE_SERVICE_KEY)) {
  console.error("⨯ SUPABASE_SERVICE_ROLE_KEY не валиден (должен начинаться на eyJ и быть 200+ символов).");
  process.exit(1);
}

const BATCH_SIZE = 5;      // synopsis длиннее title → меньше батч
const MAX_TOKENS = 3500;   // с запасом: 5 × ~500 tokens output

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

// Все synopsis без кириллицы (простой детект — быстрее чем regex на каждую запись)
async function fetchEnglishSynopsis() {
  const res = await dbFetch("/anime?synopsis=not.is.null&select=id,title_en,title_ru,synopsis&limit=1000");
  const rows = await res.json();
  const isRu = (s) => /[а-яА-Я]/.test(s || "");
  return rows.filter((r) => r.synopsis && !isRu(r.synopsis));
}

async function askClaude(batch) {
  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: MAX_TOKENS,
    system: `Ты профессиональный переводчик аниме-синопсисов на русский.

ПРАВИЛА:
1) Стиль — литературный русский, как в официальной локализации Crunchyroll/Wakanim.
   НЕ дословный подстрочник, а естественная русская фраза с тем же смыслом.

2) Имена персонажей — КАНОНИЧЕСКИЙ транслит / официальная транслитерация:
   - Eren Yeager → Эрен Йегер
   - Mikasa → Микаса
   - Miyuki Shirogane → Миюки Сироганэ
   - Kaguya Shinomiya → Кагуя Синомия
   - Chika → Тика
   - Light Yagami → Лайт Ягами
   - Edward Elric → Эдвард Элрик
   - Naruto Uzumaki → Наруто Удзумаки
   - Sasuke → Саскэ
   - Sakura → Сакура

3) Места/термины — устоявшиеся русские варианты:
   - Survey Corps → Разведкорпус
   - Shuchiin Academy → Академия Сютин
   - Demon King → Король Демонов
   - Shinigami → Синигами (или «бог смерти»)

4) Пиши с буквой «ё» где нужно (Йегер, Сакурасо, Ёко).

5) Сохраняй длину — если оригинал 3 абзаца, перевод тоже 3 абзаца (не сокращай вдвое).

6) Убирай «[Written by MAL Rewrite]», «(Source: Official Site)» и прочие пометки.

7) НЕ добавляй комментариев от себя.

ФОРМАТ ОТВЕТА — СТРОГО JSON-массив, без markdown, без комментариев:
[{"id": 123, "synopsis": "Перевод..."}, ...]`,
    messages: [
      {
        role: "user",
        content: `Переведи синопсисы этих аниме на русский:\n\n${batch.map((a) => `--- id ${a.id} | ${a.title_ru || a.title_en} ---\n${a.synopsis}`).join("\n\n")}`,
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

async function updateSynopsis(id, synopsis) {
  await dbFetch(`/anime?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({ synopsis }),
  });
}

(async () => {
  console.log("→ Ищу аниме с английским synopsis...");
  const missing = await fetchEnglishSynopsis();
  console.log(`  Найдено: ${missing.length}`);

  if (missing.length === 0) {
    console.log("✓ Все synopsis уже на русском.");
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
      for (const t of translations) {
        if (!t.id || !t.synopsis) continue;
        try {
          await updateSynopsis(t.id, t.synopsis);
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
    // Anthropic rate limit — пауза между батчами
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n✓ Переведено: ${translated}. Ошибок: ${errors}.`);
})();
