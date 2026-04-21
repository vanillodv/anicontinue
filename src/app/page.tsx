import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/admin/guard";
import { proxyImage } from "@/lib/proxyImage";

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
        id, title, content, likes_count, created_at,
        anime ( title_ru, poster_url ),
        profiles!chapters_user_id_fkey ( username )
      `)
      .eq("is_public", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const heroPosters = (popularAnime ?? []).slice(0, 4);

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
            <span>Фанфики нового поколения · 続き物語</span>
            <span className="line hidden md:inline-block" />
          </div>

          <h1
            className="ac-animate"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(56px, 10vw, 150px)",
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              marginBottom: 36,
            }}
          >
            Продолжи<br />
            <span style={{ fontStyle: "normal", fontWeight: 900, color: "transparent", WebkitTextStroke: "1.5px var(--ink)" }}>
              своё
            </span>{" "}
            <span style={{ fontStyle: "normal", fontWeight: 900, position: "relative", display: "inline-block" }}>
              любимое
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
                  boxShadow: "0 0 24px rgba(232,93,79,0.4)",
                }}
              />
            </span>
            <br />
            <span style={{ fontStyle: "normal", fontWeight: 900 }}>аниме.</span>
          </h1>

          <p
            className="ac-animate mb-11"
            style={{ maxWidth: 480, fontSize: 17, lineHeight: 1.55, color: "var(--ash)", animationDelay: "0.1s" }}
          >
            Платформа, где AI становится вашим со-автором. Выбираете тайтл — задаёте направление — получаете главу в атмосфере оригинала, с любимыми персонажами и собственным почерком.
          </p>

          <div className="flex flex-wrap gap-3.5 mb-16 ac-animate" style={{ animationDelay: "0.2s" }}>
            <Link href="/catalog" className="ac-btn primary">
              Начать бесплатно <span className="arr">→</span>
            </Link>
            <Link href="/community" className="ac-btn">В сообщество</Link>
          </div>

          <div
            className="grid ac-animate ac-line-top pt-7"
            style={{ gridTemplateColumns: "repeat(3, auto)", gap: 48, maxWidth: 560, animationDelay: "0.3s" }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {animeCount ?? 0}<span style={{ color: "var(--cinnabar)" }}>+</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 8 }}>
                аниме в каталоге
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {chaptersCount ?? 0}<span style={{ color: "var(--cinnabar)" }}>+</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 8 }}>
                глав написано
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}>∞</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 8 }}>
                сюжетных веток
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
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(242,235,217,0.08)",
                  transform: `rotate(${deg}deg)`,
                  zIndex: z,
                  animation: `ac-rise-in 1.1s cubic-bezier(0.2,0.9,0.25,1) both`,
                  animationDelay: `${0.15 + i * 0.15}s`,
                }}
              >
                {a.poster_url && (
                  <Image
                    src={proxyImage(a.poster_url)!}
                    alt={a.title_ru || a.title_en || ""}
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
              boxShadow: "0 10px 30px -5px rgba(232,93,79,0.6), 0 0 40px -10px rgba(232,93,79,0.5)",
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

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" className="relative" style={{ padding: "120px 44px" }}>
        <SectionHead num={SEC_NUMS[0]} kicker="01 · Process" title={<>Четыре шага — <b>одна глава</b></>} />

        <div className="grid ac-line-top" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { n: "一", title: "Выбери аниме", desc: "Более 100 тайтлов — от классики Гибли до сезонных новинок. Каталог постоянно пополняется." },
            { n: "二", title: "Задай направление", desc: "Настроение, жанр сцены, герои, место — всё настраивается под твой замысел." },
            { n: "三", title: "Создаём вместе", desc: "AI пишет главу в тоне оригинала — ты правишь, дополняешь, направляешь сюжет." },
            { n: "四", title: "Делись с миром", desc: "Публикуй в сообществе, собирай реакции, читай и продолжай чужие истории." },
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
                style={{ aspectRatio: "2/3", borderRadius: 2, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(242,235,217,0.06)" }}
              >
                {a.poster_url ? (
                  <Image
                    src={proxyImage(a.poster_url)!}
                    alt={a.title_ru || ""}
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
      {(recentChapters ?? []).length > 0 && (
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
            {(recentChapters as any[]).map((ch) => {
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
                        alt=""
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
            style={{ padding: "8px 16px", background: "var(--cinnabar)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", boxShadow: "0 0 30px rgba(232,93,79,0.35)" }}
          >
            ● 3 главы бесплатно · без карты
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontStyle: "italic", fontSize: "clamp(48px, 7vw, 96px)", lineHeight: 0.95, letterSpacing: "-0.025em", marginBottom: 28 }}>
            Готов написать<br />
            <b style={{ fontStyle: "normal", fontWeight: 900 }}>свою историю?</b>
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--ash)", maxWidth: 520, margin: "0 auto 40px" }}>
            Зарегистрируйся и получи три бесплатные генерации прямо сейчас. Без подписки, без кредитной карты — только ты и твоя история.
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link href="/catalog" className="ac-btn cinnabar">
              Попробовать бесплатно <span className="arr">→</span>
            </Link>
            <Link href="/pricing" className="ac-btn">Поддержать проект</Link>
          </div>
        </div>
      </section>

      {/* Responsive fallback для hero/секций */}
      <style>{`
        @media (max-width: 1100px) {
          main section:first-child {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding: 40px 24px 80px !important;
          }
          main section[id="how"] .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          main section[id="how"] .grid[style*="repeat(4"] > div { border-bottom: 1px solid var(--line); }
          main section:nth-of-type(3) .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          main section:nth-of-type(4) .grid[style*="repeat(3"] { grid-template-columns: 1fr !important; }
          main section { padding: 80px 24px !important; }
        }
        @media (max-width: 620px) {
          main section[id="how"] .grid[style*="repeat(4"] { grid-template-columns: 1fr !important; }
          main section:nth-of-type(3) .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          main section:first-child .grid[style*="repeat(3"] { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
        }
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
