"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Clock, Flame, TrendingUp } from "lucide-react";

interface CommunityChapter {
  id: string;
  title: string | null;
  preview: string;
  created_at: string;
  anime_id: number;
  user_id: string;
  likes_count: number;
  comments_count: number;
  anime_title: string | null;
  poster_url: string | null;
  username: string | null;
}

type SortKey = "new" | "popular" | "rating";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "new",     label: "Новое",       icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "popular", label: "Популярное",  icon: <Flame className="w-3.5 h-3.5" /> },
  { key: "rating",  label: "По рейтингу", icon: <TrendingUp className="w-3.5 h-3.5" /> },
];

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-6 animate-pulse" style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
      <div className="h-4 w-24" style={{ background: "rgba(var(--rgb-ink),0.08)" }} />
      <div className="h-6 w-3/4" style={{ background: "rgba(var(--rgb-ink),0.08)" }} />
      <div className="h-4 w-full" style={{ background: "rgba(var(--rgb-ink),0.05)" }} />
      <div className="h-4 w-2/3" style={{ background: "rgba(var(--rgb-ink),0.05)" }} />
      <div className="mt-auto pt-3 flex justify-between">
        <div className="h-3 w-20" style={{ background: "rgba(var(--rgb-ink),0.05)" }} />
        <div className="h-3 w-16" style={{ background: "rgba(var(--rgb-ink),0.05)" }} />
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [chapters, setChapters] = useState<CommunityChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("new");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likePending, setLikePending] = useState<Set<string>>(new Set());

  const fetchChapters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community?sort=${sort}`);
      if (!res.ok) throw new Error("Ошибка загрузки ленты");
      setChapters(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sort]);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);

  const handleLike = async (chapterId: string) => {
    if (likePending.has(chapterId)) return;
    setLikePending((prev) => new Set(prev).add(chapterId));

    try {
      const res = await fetch(`/api/chapter/${chapterId}/like`, { method: "POST" });
      if (res.status === 401) return;
      const data = await res.json();

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(chapterId); else next.delete(chapterId);
        return next;
      });

      setChapters((prev) => prev.map((c) =>
        c.id === chapterId ? { ...c, likes_count: data.likes_count } : c
      ));
    } finally {
      setLikePending((prev) => { const next = new Set(prev); next.delete(chapterId); return next; });
    }
  };

  const sorted = [...chapters].sort((a, b) => {
    if (sort === "popular") return b.likes_count - a.likes_count;
    if (sort === "rating")  return b.likes_count - a.likes_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div style={{ padding: "64px 44px 120px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div className="grid gap-8 items-end mb-14" style={{ gridTemplateColumns: "auto 1fr auto" }}>
        <div className="ac-sec-num hidden md:block">零参</div>
        <div className="ac-sec-title">
          <div className="kicker">03 · Community</div>
          <h1>Сообщество <b>читателей</b></h1>
          <p className="mt-3 max-w-md" style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ash)" }}>
            Истории, созданные другими фанатами. Читайте, ставьте лайки и возвращайтесь к любимым тайтлам.
          </p>
        </div>
        <div />
      </div>

      {/* Sort filters */}
      <div className="flex gap-2.5 flex-wrap mb-10" style={{ fontFamily: "var(--font-mono)" }}>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className="flex items-center gap-2 px-4 py-2.5 transition-all"
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              background: sort === opt.key ? "var(--ink)" : "transparent",
              color: sort === opt.key ? "var(--paper)" : "var(--ink)",
              border: `1px solid ${sort === opt.key ? "var(--ink)" : "var(--line-strong)"}`,
              borderRadius: 2,
            }}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="py-20 text-center">
          <p style={{ color: "var(--cinnabar)", fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {error}
          </p>
          <button onClick={fetchChapters} className="ac-btn mt-6">
            Попробовать снова
          </button>
        </div>
      )}

      {/* Skeleton */}
      {isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && chapters.length === 0 && (
        <div className="py-28 flex flex-col items-center text-center gap-5">
          <div
            className="w-16 h-16 flex items-center justify-center"
            style={{ background: "rgba(var(--rgb-cinnabar),0.1)", border: "1px solid rgba(var(--rgb-cinnabar),0.35)", borderRadius: 2, color: "var(--cinnabar)", fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 30 }}
          >
            続
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 22, color: "var(--ink)" }}>
              Пока нет опубликованных глав
            </p>
            <p className="mt-2" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}>
              Станьте первым
            </p>
          </div>
          <Link href="/catalog" className="ac-btn cinnabar">
            Создать историю <span className="arr">→</span>
          </Link>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && sorted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((chapter) => {
            const liked = likedIds.has(chapter.id);
            return (
              <article
                key={chapter.id}
                className="flex flex-col gap-3 p-6 transition-all"
                style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                {chapter.anime_title && (
                  <Link
                    href={`/anime/${chapter.anime_id}`}
                    className="self-start truncate max-w-full"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--cinnabar)",
                    }}
                  >
                    {chapter.anime_title}
                  </Link>
                )}

                <Link href={`/chapter/${chapter.id}`}>
                  <h2
                    className="line-clamp-2"
                    style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 20, lineHeight: 1.15, color: "var(--ink)", letterSpacing: "-0.01em" }}
                  >
                    {chapter.title || "Без названия"}
                  </h2>
                </Link>

                {chapter.preview && (
                  <Link href={`/chapter/${chapter.id}`}>
                    <p
                      className="line-clamp-3 flex-1"
                      style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ash)" }}
                    >
                      {chapter.preview}
                    </p>
                  </Link>
                )}

                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
                >
                  <span className="truncate max-w-[60%]" style={{ color: "var(--ink)" }}>@{chapter.username ?? "Аноним"}</span>
                  <span>
                    {new Date(chapter.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                <div className="grid gap-2" style={{ gridTemplateColumns: "1fr auto auto" }}>
                  <Link href={`/chapter/${chapter.id}`} className="ac-btn justify-center">
                    Читать
                  </Link>
                  <button
                    onClick={() => handleLike(chapter.id)}
                    disabled={likePending.has(chapter.id)}
                    className="flex items-center gap-1.5 px-3 py-2.5 transition-all disabled:opacity-50"
                    style={{
                      border: `1px solid ${liked ? "var(--cinnabar)" : "var(--line-strong)"}`,
                      background: liked ? "var(--cinnabar)" : "transparent",
                      color: liked ? "#fff" : "var(--ink)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      borderRadius: 2,
                    }}
                    aria-label="Лайк"
                  >
                    <Heart className="w-3.5 h-3.5" style={{ fill: liked ? "currentColor" : "none" }} />
                    {chapter.likes_count > 0 && chapter.likes_count}
                  </button>
                  <Link
                    href={`/chapter/${chapter.id}#comments`}
                    className="flex items-center gap-1.5 px-3 py-2.5 transition-all"
                    style={{
                      border: "1px solid var(--line-strong)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      borderRadius: 2,
                    }}
                    aria-label="Комментарии"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {chapter.comments_count > 0 && chapter.comments_count}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 40px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
