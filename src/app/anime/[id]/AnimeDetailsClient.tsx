"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Home, LayoutGrid } from "lucide-react";
import { translateGenre } from "@/lib/genres";
import { Anime } from "@/types";
import SceneConstructor from "@/components/reader/SceneConstructor";
import { proxyImage } from "@/lib/proxyImage";

interface AnimeDetailsClientProps {
  anime: Anime;
  lastChapter: { id: string; title: string | null } | null;
}

export default function AnimeDetailsClient({ anime, lastChapter }: AnimeDetailsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [continuePrevious, setContinuePrevious] = useState(false);

  const handleStart = (shouldContinue: boolean) => {
    setContinuePrevious(shouldContinue);
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: "44px 44px 64px", maxWidth: 1400, margin: "0 auto" }}>

      {/* Breadcrumbs */}
      <nav
        className="flex items-center gap-2 mb-10 overflow-x-auto whitespace-nowrap pb-2"
        style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
      >
        <Link href="/" className="flex items-center gap-1 transition-colors" style={{ color: "var(--ash)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--cinnabar)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ash)")}
        >
          <Home className="w-3 h-3" /> Главная
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/catalog" className="flex items-center gap-1 transition-colors" style={{ color: "var(--ash)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--cinnabar)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ash)")}
        >
          <LayoutGrid className="w-3 h-3" /> Каталог
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span style={{ color: "var(--ink)" }} className="truncate">
          {anime.title_ru || anime.title_en}
        </span>
      </nav>

      <div className="grid gap-10 lg:gap-16" style={{ gridTemplateColumns: "minmax(0, 1fr) 2fr" }}>

        {/* Poster */}
        <div className="w-full max-w-sm mx-auto lg:max-w-none">
          <div
            className="relative aspect-[2/3] w-full overflow-hidden"
            style={{
              borderRadius: 2,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(242,235,217,0.08)",
            }}
          >
            {anime.poster_url && (
              <Image
                src={proxyImage(anime.poster_url)!}
                alt={anime.title_ru || ""}
                fill
                className="object-cover"
                style={{ filter: "contrast(1.05) saturate(0.9) brightness(0.92)" }}
                priority
              />
            )}
            {anime.score && (
              <div
                className="absolute top-4 left-4 flex items-center gap-1.5 z-[2]"
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  padding: "5px 12px",
                  borderRadius: 1,
                  fontFamily: "var(--font-serif)",
                  fontWeight: 900,
                  fontSize: 17,
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ color: "var(--cinnabar)" }}>★</span>
                {Number(anime.score).toFixed(1)}
              </div>
            )}
          </div>
          <p
            className="mt-3 text-center leading-relaxed px-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)", opacity: 0.6 }}
          >
            {anime.studio ? `© ${anime.studio}. ` : ""}MyAnimeList imagery · Rights reserved
          </p>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-8">
          <div>
            <div className="ac-eyebrow mb-6">
              <span className="dot" />
              <span>{anime.year || "—"} · {anime.studio || "Anime"}</span>
              <span className="line" />
            </div>

            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "clamp(36px, 5.5vw, 80px)",
                lineHeight: 0.95,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                marginBottom: 18,
              }}
            >
              {anime.title_ru || anime.title_en}
            </h1>

            {anime.title_en && anime.title_ru && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
                {anime.title_en}
              </p>
            )}

            {Array.isArray(anime.genres) && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {anime.genres.map((genre: string) => (
                  <span
                    key={genre}
                    style={{
                      padding: "4px 10px",
                      border: "1px solid var(--line-strong)",
                      borderRadius: 1,
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {translateGenre(genre)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 ac-line-top ac-line-bottom">
            {[
              { label: "Рейтинг", value: anime.score ? Number(anime.score).toFixed(1) : "—", accent: "gold" },
              { label: "Год", value: anime.year || "—" },
              { label: "Студия", value: anime.studio || "—" },
              { label: "Серии", value: anime.episodes || "—" },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginBottom: 6 }}>
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 900,
                    fontSize: 26,
                    letterSpacing: "-0.02em",
                    color: accent === "gold" ? "var(--gold)" : "var(--ink)",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Synopsis */}
          {anime.synopsis && (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)", marginBottom: 14 }}>
                Описание
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.7, color: "var(--ink)", opacity: 0.85 }}>
                {anime.synopsis}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="pt-4 flex flex-wrap gap-3">
            {lastChapter ? (
              <>
                <button onClick={() => handleStart(true)} className="ac-btn cinnabar">
                  Продолжить историю <span className="arr">→</span>
                </button>
                <button onClick={() => handleStart(false)} className="ac-btn">
                  Начать заново
                </button>
              </>
            ) : (
              <button onClick={() => handleStart(false)} className="ac-btn cinnabar">
                Создать первую главу <span className="arr">→</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <SceneConstructor
        animeId={anime.id}
        animeName={anime.title_ru || ""}
        endingContext={anime.ending_context || ""}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialContinuePrevious={continuePrevious}
      />

      <style>{`
        @media (max-width: 1024px) {
          [data-anime-grid] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1100px) {
          main > div { padding: 32px 24px 64px !important; }
        }
      `}</style>
    </div>
  );
}
