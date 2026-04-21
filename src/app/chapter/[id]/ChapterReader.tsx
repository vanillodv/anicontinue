"use client";

import { useState, useEffect } from "react";
import { Star, Heart, ChevronRight, Home, LayoutGrid, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Chapter, Anime } from "@/types";
import CommentsSection from "@/components/chapter/CommentsSection";

interface ChapterReaderProps {
  chapter: Chapter;
  anime: Pick<Anime, "id" | "title_ru" | "title_en" | "poster_url">;
}

export default function ChapterReader({ chapter, anime }: ChapterReaderProps) {
  const [rating, setRating] = useState(chapter.rating || 0);
  const [isRating, setIsRating] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(chapter.likes_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/api/chapter/${chapter.id}/like`);
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      }
    };
    fetchLikeStatus();
  }, [chapter.id, supabase]);

  const handleRate = async (value: number) => {
    if (isRating) return;
    setIsRating(true);
    try {
      await fetch(`/api/chapter/${chapter.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      setRating(value);
    } catch {
      /* silent */
    } finally {
      setIsRating(false);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikesCount((c) => c + (optimisticLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/chapter/${chapter.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      } else {
        setLiked(!optimisticLiked);
        setLikesCount((c) => c + (optimisticLiked ? -1 : 1));
      }
    } catch {
      setLiked(!optimisticLiked);
      setLikesCount((c) => c + (optimisticLiked ? -1 : 1));
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <article style={{ padding: "44px 44px 120px", maxWidth: 880, margin: "0 auto" }}>

      {/* Breadcrumbs */}
      <nav
        className="flex items-center gap-2 mb-10 overflow-x-auto whitespace-nowrap pb-2"
        style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
      >
        <Link href="/" className="flex items-center gap-1 transition-colors" style={{ color: "var(--ash)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cinnabar)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ash)")}
        >
          <Home className="w-3 h-3" /> Главная
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/catalog" className="flex items-center gap-1 transition-colors" style={{ color: "var(--ash)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cinnabar)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ash)")}
        >
          <LayoutGrid className="w-3 h-3" /> Каталог
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/anime/${anime.id}`} className="transition-colors" style={{ color: "var(--ash)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cinnabar)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ash)")}
        >
          {anime.title_ru || anime.title_en}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="truncate" style={{ color: "var(--ink)" }}>{chapter.title || "Глава"}</span>
      </nav>

      {/* Header */}
      <header className="mb-14">
        <div className="ac-eyebrow mb-6">
          <span className="dot" />
          <span>
            {anime.title_ru || anime.title_en} · {new Date(chapter.created_at).toLocaleDateString("ru-RU", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
          <span className="line hidden md:inline-block" />
        </div>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(36px, 6vw, 72px)",
            lineHeight: 1,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          {chapter.title || "Новая глава"}
        </h1>
      </header>

      {/* Content — сам читательский блок. Serif, увеличенный интерлиньяж,
          широкая раскладка, чуть сдержаннее цвет текста. */}
      <div
        className="mb-16"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(17px, 1.3vw, 19px)",
          lineHeight: 1.75,
          color: "var(--ink)",
          opacity: 0.92,
        }}
      >
        {chapter.content.split("\n").map((paragraph, idx) =>
          paragraph.trim() ? (
            <p key={idx} style={{ marginBottom: "1.5em", textIndent: "1.5em" }}>
              {paragraph}
            </p>
          ) : null
        )}
      </div>

      {/* Footer actions */}
      <footer className="ac-line-top pt-12 mb-16">
        <div
          className="p-7 md:p-9 space-y-6 text-center"
          style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)", marginBottom: 10 }}>
              Оценка
            </div>
            <h3
              style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 22, color: "var(--ink)" }}
            >
              Понравилась глава?
            </h3>
          </div>

          {/* Like */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-2.5 transition-all disabled:opacity-50"
              style={{
                padding: "10px 22px",
                borderRadius: 2,
                border: `1px solid ${liked ? "var(--cinnabar)" : "var(--line-strong)"}`,
                background: liked ? "var(--cinnabar)" : "transparent",
                color: liked ? "#fff" : "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <Heart className="w-4 h-4" style={{ fill: liked ? "currentColor" : "none" }} />
              {likesCount > 0 ? likesCount : "Нравится"}
            </button>
          </div>

          {/* Stars */}
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                disabled={isRating}
                className="p-1 transition-transform hover:scale-110 active:scale-90 disabled:opacity-50"
              >
                <Star
                  className="w-7 h-7"
                  style={{
                    color: star <= rating ? "var(--gold)" : "var(--line-strong)",
                    fill: star <= rating ? "var(--gold)" : "transparent",
                    filter: star <= rating ? "drop-shadow(0 0 8px rgba(223,181,94,0.4))" : "none",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* Next steps */}
      <div className="flex flex-wrap gap-3 justify-center mb-20">
        <Link href={`/anime/${anime.id}`} className="ac-btn cinnabar">
          Создать ещё одну главу <span className="arr">→</span>
        </Link>
        <Link href="/catalog" className="ac-btn">
          <ArrowLeft className="w-3.5 h-3.5" /> В каталог
        </Link>
      </div>

      {/* Comments */}
      <CommentsSection chapterId={chapter.id} />

      <style>{`
        @media (max-width: 1100px) {
          article { padding: 32px 24px 80px !important; }
        }
      `}</style>
    </article>
  );
}
