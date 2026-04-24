import { Anime } from "@/types";
import { CustomCharacter } from "@/lib/validate";
import { StoryContext, buildContextBlock, getTypeNote } from "@/lib/story/bible";

export function getMasterSystemPrompt(
  anime: Anime,
  userEndingContext?: string,
  userStartingPoint?: string,
  previousContext?: string,
  customCharacters?: CustomCharacter[],
) {
  const genres = Array.isArray(anime.genres) ? anime.genres.join(", ") : (anime.genres || "");
  const characters = Array.isArray(anime.characters)
    ? anime.characters.join(", ")
    : (anime.characters || "");

  const worldContext = userEndingContext || anime.ending_context || "";
  const hasEnding = worldContext.trim().length > 0;

  const endingBlock = hasEnding
    ? `ФИНАЛ ОРИГИНАЛА / ТОЧКА ОТПРАВЛЕНИЯ:\n${worldContext}\nИменно отсюда начинается твоя глава.`
    : `МИРОУСТРОЙСТВО:\nИспользуй описание выше как основу. Действие происходит В МИРЕ ЭТОГО АНИМЕ, среди его персонажей и событий. Не придумывай другой сеттинг.`;

  const startingBlock = userStartingPoint
    ? `НАЧАЛО ГЛАВЫ: "${userStartingPoint}" — начни именно с этого момента.`
    : "";

  const previousBlock = previousContext
    ? `ТВОИ ПРЕДЫДУЩИЕ ГЛАВЫ (сохраняй преемственность):\n${previousContext}\nПерсонажи помнят всё, что произошло. Продолжай без противоречий.`
    : "";

  const customBlock = customCharacters && customCharacters.length > 0
    ? `ДОПОЛНИТЕЛЬНЫЕ ПЕРСОНАЖИ (впиши их в историю органично):\n${customCharacters.map(c => `• ${c.name}${c.role ? ` — ${c.role}` : ""}`).join("\n")}\nОни взаимодействуют с оригинальными героями и влияют на сюжет.`
    : "";

  const curatedBlock = (anime as any).prompt_template
    ? `═══════════════════════════════\nКУРИРОВАННЫЕ ЗНАНИЯ О ТАЙТЛЕ\n═══════════════════════════════\n${(anime as any).prompt_template}\n`
    : "";

  return `Ты — профессиональный автор фанфиков, специализирующийся на аниме. Пишешь продолжение к "${anime.title_ru || anime.title_en}".

═══════════════════════════════
ДОСЬЕ НА АНИМЕ
═══════════════════════════════
Название: ${anime.title_ru}${anime.title_en ? ` / ${anime.title_en}` : ""}
Год/Студия: ${anime.year || "—"}, ${anime.studio || "—"}
Жанры: ${genres || "не указаны"}
Число серий: ${anime.episodes || "неизвестно"}

СЮЖЕТ ОРИГИНАЛА:
${anime.synopsis || "Синопсис не указан."}

${characters ? `ПЕРСОНАЖИ ОРИГИНАЛА:\n${characters}` : ""}

${curatedBlock}

═══════════════════════════════
КОНТЕКСТ ДЛЯ ГЛАВЫ
═══════════════════════════════
${endingBlock}
${startingBlock}
${previousBlock}
${customBlock}

═══════════════════════════════
ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА
═══════════════════════════════
1. ПРОДОЛЖАЙ ОРИГИНАЛ, не пиши новую историю с нуля. Твоя глава — органичное продолжение мира аниме.
2. Персонажи говорят и действуют так, как в оригинале: сохраняй их характер, манеру речи, мотивы.
3. Сеттинг неизменен: тот же мир, правила магии/физики/технологий что и в оригинале.
4. Пиши ТОЛЬКО на русском языке, богатым литературным слогом.
5. Объём: 900–1300 слов основного текста.
6. Последний абзац — cliffhanger или эмоциональный крючок.
7. НЕЛЬЗЯ: менять характер персонажей, ломать канон без оснований, делать резкие жанровые сдвиги без запроса.

═══════════════════════════════
ФОРМАТ ОТВЕТА (строго XML)
═══════════════════════════════
<title>Название главы</title>
<content>
Полный текст главы (900–1300 слов)
</content>
<summary>Одно предложение: что произошло в этой главе (для следующей генерации)</summary>`;
}

export function buildPrompt(
  anime: Anime,
  params: {
    mood?: string;
    sceneType?: string;
    endingContext?: string;
    startingPoint?: string;
    continuePrevious?: boolean;
    customCharacters?: CustomCharacter[];
  },
  storyCtx?: StoryContext | null,
) {
  // Story Bible + предыдущие главы — многослойный контекст для любого N
  const contextBlock = storyCtx ? buildContextBlock(storyCtx, params.sceneType ?? '') : '';

  // Для совместимости с getMasterSystemPrompt: передаём текст последней главы
  // через previousContext только если нет полноценного storyCtx
  const legacyPrevContext = '';

  const allCustomChars = params.customCharacters ?? [];

  const system = getMasterSystemPrompt(
    anime,
    params.endingContext,
    params.startingPoint,
    // Контекст предыдущих глав теперь приходит через storyCtx → contextBlock
    contextBlock || legacyPrevContext,
    allCustomChars,
  );

  const moodMap: Record<string, string> = {
    Экшн: "динамичная экшн-сцена с конфликтом и напряжением",
    Драма: "эмоциональная драматическая сцена с внутренним переживанием персонажей",
    Романтика: "романтическая сцена с чувствами и близостью между персонажами",
    Юмор: "лёгкая комедийная сцена с юмором в духе оригинала",
  };

  const mood = params.mood ? (moodMap[params.mood] || params.mood) : "продолжение в тоне оригинала";

  // Fix 5: typeNote без противоречий — чёткая инструкция для каждого sceneType
  const typeNote = getTypeNote(params.sceneType);

  const user = `Напиши главу. Настроение: ${mood}. ${typeNote}`;

  return { system, user };
}
