import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/admin/guard";
import { proxyImage } from "@/lib/proxyImage";
import ExamplePreview from "@/components/landing/ExamplePreview";

export const dynamic = 'force-dynamic';

const SEC_NUMS = ["零壱", "零弐", "零参"];

export default async function Home() {
  const supabase = await createClient();
  const svc = serviceClient();

  const [
    { data: popularAnime },
    { count: animeCount },
    { count: chaptersCount },
    { data: recentChapters },
  ] = await Promise.all([
    supabase
      .from("anime")
      .select("id, title_ru, title_en, poster_url, score, genres, year, studio")
      .order("score", { ascending: false })
      .limit(8),
    supabase.from("anime").select("*", { count: "exact", head: true }),
    supabase
      .from("chapters")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("is_deleted", false),
    svc
      .from("chapters")
      .select(`
        id, title, content, likes_count, created_at, user_id, anime_id,
        anime ( title_ru, poster_url ),
        profiles!chapters_user_id_fkey ( username )
      `)
      .eq("is_public", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const heroPosters = (popularAnime ?? []).slice(0, 4);

  // Курация «Свежих глав» — берём 3 разные главы: не больше одной на автора
  // и не больше одной на аниме, чтобы не выглядело антидоказательством
  // (раньше вся витрина была от одного пользователя по одному тайтлу).
  const curatedChapters = (() => {
    const list = (recentChapters as any[]) ?? [];
    const seenAuthors = new Set<string>();
    const seenAnime = new Set<number>();
    const picked: any[] = [];
    for (const ch of list) {
      if (picked.length >= 3) break;
      const author = ch.user_id;
      const anime = ch.anime_id;
      if (seenAuthors.has(author)) continue;
      if (seenAnime.has(anime)) continue;
      seenAuthors.add(author);
      seenAnime.add(anime);
      picked.push(ch);
    }
    // Фолбэк: если разнообразия не хватает — добираем любыми свежими
    if (picked.length < 3) {
      for (const ch of list) {
        if (picked.length >= 3) break;
        if (!picked.includes(ch)) picked.push(ch);
      }
    }
    return picked;
  })();

  return (
    <div style={{ color: "var(--ink)" }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative grid items-end"
        style={{
          padding: "64px 44px 120px",
          gridTemplateColumns: "minmax(0, 1fr) 420px",
          gap: 60,
          minHeight: "calc(100vh - 72px)",
        }}
      >
        {/* Огромный 第壱話 на фоне */}
        <div
          className="pointer-events-none absolute hidden lg:block"
          style={{
            top: 80,
            right: 480,
            fontFamily: "var(--font-jp)",
            fontWeight: 900,
            fontSize: "clamp(180px, 28vw, 380px)",
            lineHeight: 0.85,
            color: "var(--ink)",
            opacity: 0.05,
            letterSpacing: "-0.05em",
          }}
        >
          第 壱 話
        </div>

        <div className="relative z-[2]">
          <div className="ac-eyebrow mb-9 ac-animate">
            <span className="dot" />
            <span>Недосказанное · 続きは君が書く</span>
            <span className="line hidden md:inline-block" />
          </div>

          <h1
            className="ac-animate"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(52px, 9.5vw, 140px)",
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              marginBottom: 36,
            }}
          >
            Допиши<br />
            <span style={{ fontStyle: "normal", fontWeight: 900, color: "transparent", WebkitTextStroke: "1.5px var(--ink)" }}>
              то, что канон
            </span>
            <br />
            <span style={{ fontStyle: "normal", fontWeight: 900, position: "relative", display: "inline-block" }}>
              не додал.
              <span
                aria-hidden
                style={{
                  content: "''",
                  position: "absolute",
                  left: -4, right: -4, bottom: 10,
                  height: 18,
                  background: "var(--cinnabar)",
                  zIndex: -1,
                  opacity: 0.9,
                  transform: "skewX(-6deg)",
                  boxShadow: "0 0 24px rgba(var(--rgb-cinnabar),0.4)",
                }}
              />
            </span>
          </h1>

          <p
            className="ac-animate mb-11"
            style={{ maxWidth: 520, fontSize: 17, lineHeight: 1.6, color: "var(--ash)", animationDelay: "0.1s" }}
          >
            Любимая пара, которая так и не призналась. Арка, оборванная на финале.
            Герой, которому не дали шанса. AI поможет дописать — в атмосфере оригинала,
            за пару минут, с твоим замыслом.
          </p>

          <div className="flex flex-wrap gap-3.5 mb-16 ac-animate" style={{ animationDelay: "0.2s" }}>
            <Link href="/catalog" className="ac-btn primary">
              Написать первую главу <span className="arr">→</span>
            </Link>
            <Link href="/community" className="ac-btn">Читать сообщество</Link>
          </div>

          <div
            className="grid ac-animate ac-line-top pt-7"
            style={{ gridTemplateColumns: "repeat(3, auto)", gap: 48, maxWidth: 620, animationDelay: "0.3s" }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em" }}>
                3<span style={{ color: "var(--cinnabar)" }}>/∞</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 8 }}>
                глав бесплатно
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em" }}>
                ~2k
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 8 }}>
                слов в главе
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: "-0.02em" }}>
                30<span style={{ color: "var(--cinnabar)" }}>с</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 8 }}>
                от идеи до главы
              </div>
            </div>
          </div>
        </div>

        {/* Poster collage справа */}
        <div className="relative hidden lg:block" style={{ height: 640 }}>
          <div
            className="absolute"
            style={{
              left: -30, top: "50%", transform: "translateY(-50%)",
              writingMode: "vertical-rl", textOrientation: "mixed",
              fontFamily: "var(--font-jp)", fontWeight: 700, fontSize: 14,
              letterSpacing: "0.3em", color: "var(--ash)",
            }}
          >
            第一話 · ハジマリ
          </div>

          {heroPosters.map((a, i) => {
            const positions: Array<{ width: number; height: number; top?: number; left?: number; right?: number; bottom?: number; deg: number; z: number }> = [
              { width: 280, height: 400, top: 40, left: 40, deg: -5, z: 2 },
              { width: 260, height: 370, top: 20, right: 20, deg: 4, z: 3 },
              { width: 220, height: 310, bottom: 40, left: 20, deg: 6, z: 4 },
              { width: 200, height: 280, bottom: 10, right: 60, deg: -3, z: 1 },
            ];
            const p = positions[i];
            if (!p) return null;
            const { deg, z, ...rest } = p;
            return (
              <Link
                key={a.id}
                href={`/anime/${a.id}`}
                className="absolute overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1)] hover:rotate-0 hover:scale-105"
                style={{
                  ...rest,
                  borderRadius: 2,
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(var(--rgb-ink),0.08)",
                  transform: `rotate(${deg}deg)`,
                  zIndex: z,
                  animation: `ac-rise-in 1.1s cubic-bezier(0.2,0.9,0.25,1) both`,
                  animationDelay: `${0.15 + i * 0.15}s`,
                }}
              >
                {a.poster_url && (
                  <Image
                    src={proxyImage(a.poster_url)!}
                    alt={a.title_ru || a.title_en || "Постер аниме"}
                    fill
                    className="object-cover"
                    style={{ filter: "contrast(1.05) saturate(0.9) brightness(0.92)" }}
                    sizes="400px"
                  />
                )}
                <div
                  className="absolute left-3 right-3 bottom-2.5 flex justify-between items-end"
                  style={{ color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
                >
                  <span>{a.title_en || a.title_ru}</span>
                  {a.score && (
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 900, color: "var(--gold)" }}>
                      {Number(a.score).toFixed(1)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Печать — прижата к правому краю poster-stack, не вылезает за него */}
          <div
            className="absolute"
            style={{
              top: -10, right: 0, width: 100, height: 100, borderRadius: "50%",
              background: "var(--cinnabar)", color: "#fff",
              display: "grid", placeItems: "center", textAlign: "center",
              fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 14, lineHeight: 1.25,
              transform: "rotate(12deg)",
              boxShadow: "0 10px 30px -5px rgba(var(--rgb-cinnabar),0.6), 0 0 40px -10px rgba(var(--rgb-cinnabar),0.5)",
              zIndex: 6, letterSpacing: "0.05em",
            }}
          >
            <span className="relative">続<br />作</span>
            <span
              className="absolute pointer-events-none"
              style={{ inset: 6, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.45)" }}
            />
          </div>
        </div>
      </section>

      {/* ── EXAMPLE CHAPTER (интерактивное демо, закрывает страх «а вдруг плохо пишет») ── */}
      <ExamplePreview />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" className="relative" style={{ padding: "120px 44px" }}>
        <SectionHead num={SEC_NUMS[0]} kicker="01 · Process" title={<>Четыре шага — <b>одна глава</b></>} />

        <div className="grid ac-line-top" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { n: "一", title: "Выбери тайтл",       desc: "Каталог от классики Гибли до сезонных новинок. Любимое аниме, любимая пара, любимый герой." },
            { n: "二", title: "Задай, чего не хватило", desc: "Романтика, драма, экшн, юмор. Продолжение финала или альтернативная концовка. Свои персонажи — опционально." },
            { n: "三", title: "Получи главу",        desc: "~2000 слов в тоне оригинала, за 30 секунд. Герои в характере, без клише, без markdown и смайликов." },
            { n: "四", title: "Читай и делись",      desc: "Оставляй в личной библиотеке или публикуй в сообществе. Подписчики ставят лайки и комментируют." },
          ].map((s, i) => (
            <div
              key={i}
              className="relative transition-colors duration-300"
              style={{ padding: "44px 28px 60px", borderRight: i < 3 ? "1px solid var(--line)" : "none" }}
            >
              <div className="flex items-center gap-2.5" style={{ fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 20, color: "var(--cinnabar)", marginBottom: 56 }}>
                <span>Шаг 0{i + 1}</span>
                <span className="flex-1 h-px" style={{ background: "var(--line-strong)" }} />
              </div>
              <div
                className="absolute top-14 right-7 pointer-events-none"
                style={{ fontSize: 64, opacity: 0.08, fontFamily: "var(--font-jp)", fontWeight: 900, color: "var(--ink)" }}
              >
                {s.n}
              </div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 28, lineHeight: 1.05, marginBottom: 14, letterSpacing: "-0.01em", color: "var(--ink)" }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ash)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── POPULAR ANIME ────────────────────────────────────────────── */}
      <section className="relative" style={{ padding: "120px 44px" }}>
        <SectionHead
          num={SEC_NUMS[1]}
          kicker="02 · Catalog"
          title={<>Популярные <b>тайтлы</b></>}
          link={{ href: "/catalog", label: "Весь каталог →" }}
        />

        <div className="grid gap-7" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {(popularAnime ?? []).map((a, i) => (
            <Link key={a.id} href={`/anime/${a.id}`} className="group relative">
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: "2/3", borderRadius: 2, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(var(--rgb-ink),0.06)" }}
              >
                {a.poster_url ? (
                  <Image
                    src={proxyImage(a.poster_url)!}
                    alt={a.title_ru || a.title_en || "Постер аниме"}
                    fill
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1)] group-hover:scale-110"
                    style={{ filter: "contrast(1.03) saturate(0.95) brightness(0.95)" }}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: "var(--paper-2)" }} />
                )}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%)" }}
                />
                {a.score && (
                  <div
                    className="absolute top-3.5 left-3.5 z-[2] flex items-center gap-1.5"
                    style={{ background: "var(--ink)", color: "var(--paper)", padding: "4px 10px", borderRadius: 1, fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 15, letterSpacing: "-0.02em" }}
                  >
                    <span style={{ color: "var(--cinnabar)" }}>★</span>
                    {Number(a.score).toFixed(1)}
                  </div>
                )}
                <div
                  className="absolute top-3.5 right-4 z-[2]"
                  style={{ fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 40, color: "#fff", lineHeight: 1, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="absolute left-4 right-4 bottom-4 z-[2]"
                  style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 17, lineHeight: 1.15, color: "#fff", letterSpacing: "-0.01em" }}
                >
                  {a.title_ru || a.title_en}
                </div>
              </div>
              <div
                className="mt-3.5 flex justify-between items-center"
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
              >
                <span>{[a.studio, a.year].filter(Boolean).join(" · ") || "Anime"}</span>
                <span className="opacity-0 -translate-x-1.5 transition-all group-hover:opacity-100 group-hover:translate-x-0" style={{ color: "var(--ink)" }}>
                  Открыть →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FRESH CHAPTERS (светлый остров) ──────────────────────────── */}
      {curatedChapters.length > 0 && (
        <section
          className="relative"
          style={{ background: "var(--inv-bg)", color: "var(--inv-fg)", padding: "120px 44px" }}
        >
          <div className="grid grid-cols-[auto_1fr_auto] gap-8 items-end mb-16">
            <div style={{ fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 80, lineHeight: 0.9, color: "var(--cinnabar-deep)", letterSpacing: "-0.04em" }}>
              {SEC_NUMS[2]}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--inv-ash)", marginBottom: 14 }}>
                03 · Community
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontStyle: "italic", fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1, letterSpacing: "-0.02em", color: "var(--inv-fg)" }}>
                Свежие <b style={{ fontStyle: "normal", fontWeight: 900 }}>главы</b>
              </h2>
            </div>
            <Link
              href="/community"
              className="pb-1 transition-colors"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--inv-fg)", borderBottom: "1px solid var(--inv-fg)" }}
            >
              Все главы →
            </Link>
          </div>

          <div className="grid gap-9" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {curatedChapters.map((ch) => {
              const preview = ch.content?.replace(/\n+/g, " ").slice(0, 180).trim();
              return (
                <Link
                  key={ch.id}
                  href={`/chapter/${ch.id}`}
                  className="group relative grid gap-5 ac-card-inv"
                  style={{ gridTemplateColumns: "70px 1fr", padding: 28 }}
                >
                  <div className="w-[70px] h-[100px] overflow-hidden" style={{ borderRadius: 1, background: "#e7dfcf" }}>
                    {ch.anime?.poster_url && (
                      <Image
                        src={proxyImage(ch.anime.poster_url)!}
                        alt={ch.anime?.title_ru || "Постер аниме"}
                        width={70}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cinnabar-deep)", marginBottom: 10 }}>
                      {ch.anime?.title_ru}
                    </div>
                    <h4 style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 22, lineHeight: 1.15, marginBottom: 12, letterSpacing: "-0.01em", color: "var(--inv-fg)" }}>
                      {ch.title || "Без названия"}
                    </h4>
                    {preview && (
                      <p
                        style={{ fontSize: 13, lineHeight: 1.55, color: "var(--inv-ash)", marginBottom: 18, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {preview}…
                      </p>
                    )}
                    <div className="flex justify-between items-center" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--inv-ash)" }}>
                      <span style={{ color: "var(--inv-fg)" }}>@{(ch.profiles as any)?.username ?? "Аноним"}</span>
                      <span>{Math.max(1, Math.round((ch.content?.length || 0) / 1000))} мин чтения</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-center" style={{ padding: "140px 44px" }}>
        <div
          className="absolute inset-0 grid place-items-center pointer-events-none"
          style={{ fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: "clamp(280px, 40vw, 580px)", color: "var(--cinnabar)", opacity: 0.09, lineHeight: 0.85, letterSpacing: "-0.05em" }}
        >
          続
        </div>
        <div className="relative z-[2] max-w-[780px] mx-auto">
          <div
            className="inline-flex gap-2.5 items-center mb-8"
            style={{ padding: "8px 16px", background: "var(--cinnabar)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", boxShadow: "0 0 30px rgba(var(--rgb-cinnabar),0.35)" }}
          >
            ● 3 главы бесплатно · без карты
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontStyle: "italic", fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.025em", marginBottom: 28 }}>
            Напиши ту главу,<br />
            <b style={{ fontStyle: "normal", fontWeight: 900 }}>которую ждал годами.</b>
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--ash)", maxWidth: 540, margin: "0 auto 40px" }}>
            Регистрация в одно касание. Три главы бесплатно — проверишь качество,
            решишь потом. Без карты, без подписки, без «пробного периода на 7 дней».
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link href="/catalog" className="ac-btn cinnabar">
              Попробовать бесплатно <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Responsive — breakpoints для hero/секций */}
      <style>{`
        @media (max-width: 1400px) {
          /* на 1100-1400px hero всё ещё 2 колонки, но колонка с коллажем уже меньше */
          main section:first-child { gap: 40px !important; padding-left: 32px !important; padding-right: 32px !important; }
        }
        @media (max-width: 1100px) {
          /* tablet → hero в одну колонку, коллаж скрыт (у него .hidden.lg:block) */
          main section:first-child {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            padding: 40px 24px 80px !important;
            min-height: auto !important;
          }
          main section:first-child h1 { font-size: clamp(44px, 9vw, 88px) !important; }
          main section[id="how"] .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          main section[id="how"] .grid[style*="repeat(4"] > div { border-bottom: 1px solid var(--line); }
          main section:nth-of-type(3) .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
          main section:nth-of-type(4) .grid[style*="repeat(3"] { grid-template-columns: 1fr !important; }
          main section { padding: 64px 24px !important; }
          .ac-sec-num { font-size: 56px !important; }
        }
        @media (max-width: 620px) {
          /* mobile */
          main section:first-child { padding: 24px 16px 48px !important; }
          main section:first-child h1 { font-size: clamp(36px, 10vw, 64px) !important; margin-bottom: 20px !important; }
          main section:first-child p { font-size: 15px !important; }
          main section:first-child .grid[style*="repeat(3"] {
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            max-width: 100% !important;
          }
          main section[id="how"] .grid[style*="repeat(4"] { grid-template-columns: 1fr !important; }
          main section[id="how"] .grid[style*="repeat(4"] > div { border-right: none !important; }
          main section:nth-of-type(3) .grid[style*="repeat(4"] { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          main section { padding: 48px 16px !important; }
          .ac-sec-num { font-size: 42px !important; }
          .ac-sec-title h2 { font-size: clamp(28px, 7vw, 40px) !important; }
          /* «Свежие главы» светлый остров */
          main section:nth-of-type(4) { margin: 0 -16px !important; padding: 48px 16px !important; }
          main section:nth-of-type(4) .grid[style*="auto 1fr auto"] { grid-template-columns: 1fr !important; gap: 16px !important; }
          /* CTA */
          main section:last-of-type { padding: 64px 16px !important; }
        }
        /* Горизонтальный скролл защита */
        html, body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}

function SectionHead({
  num, kicker, title, link,
}: {
  num: string;
  kicker: string;
  title: React.ReactNode;
  link?: { href: string; label: string };
}) {
  return (
    <div
      className="grid gap-7 items-end mb-[70px]"
      style={{ gridTemplateColumns: "auto 1fr auto" }}
    >
      <div className="ac-sec-num">{num}</div>
      <div className="ac-sec-title">
        <div className="kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
      {link ? <Link href={link.href} className="ac-sec-link">{link.label}</Link> : <div />}
    </div>
  );
}
