import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, ArrowRight, Globe, Lock, Star, Heart } from "lucide-react";
import { Profile, Chapter, Anime } from "@/types";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Личный кабинет AniContinue — ваш профиль, статистика и история написанных глав.",
};

interface ExtendedChapter extends Chapter {
  anime: Pick<Anime, "id" | "title_ru" | "title_en" | "poster_url">;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [
    { data: profile },
    { data: chapters },
    { data: likesReceived },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single() as any,
    supabase.from("chapters").select("*, anime(id, title_ru, title_en, poster_url)")
      .eq("user_id", user.id).eq("is_deleted", false)
      .order("created_at", { ascending: false }).limit(20) as any,
    supabase.from("chapters").select("likes_count").eq("user_id", user.id).eq("is_deleted", false),
  ]).catch(() => [{ data: null }, { data: [] }, { data: [] }]) as any[];

  const typedProfile = profile as Profile;
  const typedChapters = (chapters ?? []) as ExtendedChapter[];

  const chaptersUsed = typedProfile?.chapters_used || 0;
  const chaptersLimit = typedProfile?.chapters_limit || 3;
  const progressPercent = Math.min((chaptersUsed / chaptersLimit) * 100, 100);
  const totalLikes = (likesReceived ?? []).reduce((s: number, c: any) => s + (c.likes_count ?? 0), 0);
  const avgRating = typedChapters.filter((c) => c.rating).length > 0
    ? (typedChapters.filter((c) => c.rating).reduce((s, c) => s + (c.rating ?? 0), 0) / typedChapters.filter((c) => c.rating).length).toFixed(1)
    : "—";

  return (
    <div style={{ padding: "44px 44px 120px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Profile header */}
      <section className="mb-10 flex flex-col md:flex-row items-center md:items-start gap-7 md:gap-10">
        <div
          className="relative w-28 h-28 overflow-hidden shrink-0"
          style={{
            border: "1px solid var(--line-strong)",
            borderRadius: 2,
            boxShadow: "0 0 40px rgba(232,93,79,0.18)",
          }}
        >
          {user.user_metadata.avatar_url ? (
            <Image src={user.user_metadata.avatar_url} alt="Avatar" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(232,93,79,0.12)", color: "var(--cinnabar)" }}>
              <User className="w-10 h-10" />
            </div>
          )}
        </div>

        <div className="flex-grow text-center md:text-left">
          <div className="ac-eyebrow mb-4 justify-center md:justify-start">
            <span className="dot" />
            <span>{(typedProfile?.chapters_limit ?? 3) > 3 ? "愛好家 · Меценат" : "読者 · Участник"}</span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(32px, 5vw, 56px)",
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              marginBottom: 8,
            }}
          >
            <b style={{ fontStyle: "normal", fontWeight: 900 }}>
              {typedProfile?.username || user.user_metadata.full_name || user.email?.split("@")[0]}
            </b>
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--ash)", marginBottom: 18 }}>
            {user.email}
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-8">
            {[
              { label: "Главы", value: chaptersUsed },
              { label: "Лайки", value: totalLikes },
              { label: "Рейтинг", value: avgRating, accent: "gold" },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 900,
                    fontSize: 32,
                    letterSpacing: "-0.02em",
                    color: accent === "gold" ? "var(--gold)" : "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 6 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex md:flex-col gap-2 shrink-0">
          <Link href="/settings" className="ac-btn">Настройки</Link>
          <Link href="/profile/history" className="ac-btn">История</Link>
        </div>
      </section>

      {/* Limit progress */}
      <section className="mb-14 p-7" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)", marginBottom: 6 }}>
              生成 · Generation budget
            </div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 22, color: "var(--ink)" }}>
              Использовано {chaptersUsed} / {chaptersLimit}
            </h2>
            <p className="mt-1" style={{ fontSize: 13, color: "var(--ash)" }}>
              Первые 3 генерации — всегда бесплатно
            </p>
          </div>
          <Link href="/pricing" className="ac-btn cinnabar">
            <Heart className="w-3.5 h-3.5" /> Поддержать проект
          </Link>
        </div>
        <div className="relative h-1.5" style={{ background: "var(--line)" }}>
          <div
            className="absolute inset-y-0 left-0 transition-all duration-700"
            style={{ width: `${progressPercent}%`, background: "var(--cinnabar)" }}
          />
        </div>
      </section>

      {/* My chapters */}
      <section>
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div className="ac-sec-title">
            <div className="kicker">Мои главы · My chapters</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)" }}>
              История <b>творчества</b>
            </h2>
          </div>
          {typedChapters.length > 0 && (
            <Link href="/profile/history" className="ac-sec-link">Все главы →</Link>
          )}
        </div>

        {typedChapters.length === 0 ? (
          <div
            className="py-24 text-center flex flex-col items-center gap-5"
            style={{ background: "var(--paper-2)", border: "1px dashed var(--line-strong)" }}
          >
            <div
              className="w-14 h-14 flex items-center justify-center"
              style={{ background: "rgba(232,93,79,0.1)", border: "1px solid rgba(232,93,79,0.35)", color: "var(--cinnabar)", fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 26 }}
            >
              続
            </div>
            <p style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 20, color: "var(--ink)" }}>
              Вы ещё не создали ни одной главы
            </p>
            <Link href="/catalog" className="ac-btn cinnabar">
              Перейти в каталог <span className="arr">→</span>
            </Link>
          </div>
        ) : (() => {
          const groups = new Map<number, { title: string; posterUrl: string | null; animeId: number; chapters: ExtendedChapter[] }>();
          for (const ch of typedChapters) {
            const aid = (ch.anime as any)?.id ?? -1;
            if (!groups.has(aid)) {
              groups.set(aid, {
                animeId: aid,
                title: ch.anime?.title_ru || ch.anime?.title_en || "Неизвестное аниме",
                posterUrl: ch.anime?.poster_url ?? null,
                chapters: [],
              });
            }
            groups.get(aid)!.chapters.push(ch);
          }
          const groupList = Array.from(groups.values()).slice(0, 4);

          return (
            <div className="space-y-4">
              {groupList.map((g) => (
                <div key={g.animeId} style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="relative w-10 h-14 overflow-hidden shrink-0" style={{ borderRadius: 1 }}>
                      {g.posterUrl ? (
                        <Image src={g.posterUrl} alt={g.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--line)", color: "var(--ash)", fontFamily: "var(--font-jp)", fontWeight: 900 }}>
                          続
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/anime/${g.animeId}`}
                        className="block truncate"
                        style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cinnabar)" }}
                      >
                        {g.title}
                      </Link>
                      <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginTop: 2 }}>
                        {g.chapters.length} {g.chapters.length === 1 ? "глава" : g.chapters.length < 5 ? "главы" : "глав"}
                      </div>
                    </div>
                    <Link href="/profile/history" className="ac-sec-link shrink-0" style={{ fontSize: 10 }}>Все →</Link>
                  </div>

                  <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {g.chapters.slice(0, 3).map((chapter) => (
                      <div
                        key={chapter.id}
                        className="group flex items-center gap-3 px-5 py-3.5 ac-row"
                        style={{ borderTop: "1px solid var(--line)" }}
                      >
                        <div className="shrink-0" style={{ color: chapter.is_public ? "#86EFAC" : "var(--ash)" }}>
                          {chapter.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                            {chapter.title || "Без названия"}
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ash)", marginTop: 2 }}>
                            {new Date(chapter.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                          {chapter.rating && (
                            <span className="flex items-center gap-1" style={{ color: "var(--gold)" }}>
                              <Star className="w-3 h-3" style={{ fill: "var(--gold)" }} />{chapter.rating}
                            </span>
                          )}
                          {chapter.likes_count > 0 && (
                            <span className="flex items-center gap-1" style={{ color: "var(--cinnabar)" }}>
                              <Heart className="w-3 h-3" />{chapter.likes_count}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/chapter/${chapter.id}`}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ac-icon-btn"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {groups.size > 4 && (
                <Link
                  href="/profile/history"
                  className="flex items-center justify-center gap-2 py-3.5"
                  style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink)" }}
                >
                  Показать все аниме <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })()}
      </section>

      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 32px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
