"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Anime } from "@/types";
import { translateGenre } from "@/lib/genres";
import { proxyImage } from "@/lib/proxyImage";

interface AnimeCardProps {
  anime?: Anime;
  isLoading?: boolean;
}

export default function AnimeCard({ anime, isLoading }: AnimeCardProps) {
  const [imgError, setImgError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="aspect-[2/3] w-full animate-pulse" style={{ background: "var(--paper-2)", borderRadius: 2 }} />
        <div className="h-5 w-3/4 animate-pulse" style={{ background: "var(--paper-2)", borderRadius: 1 }} />
        <div className="h-4 w-1/2 animate-pulse" style={{ background: "var(--paper-2)", borderRadius: 1 }} />
      </div>
    );
  }

  if (!anime) return null;

  const posterSrc = proxyImage(anime.poster_url);
  const showImage = posterSrc && !imgError;

  return (
    <Link href={`/anime/${anime.id}`} className="group flex flex-col gap-3">
      <div
        className="relative aspect-[2/3] w-full overflow-hidden"
        style={{
          borderRadius: 2,
          background: "var(--paper-2)",
          boxShadow: "0 10px 30px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(242,235,217,0.06)",
        }}
      >
        {showImage ? (
          <Image
            src={posterSrc!}
            alt={anime.title_en || "Anime poster"}
            fill
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1)] group-hover:scale-105"
            style={{ filter: "contrast(1.03) saturate(0.95) brightness(0.95)" }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center" style={{ color: "var(--ash)", fontFamily: "var(--font-jp)" }}>
            <span className="text-4xl font-black">続</span>
            <span className="text-xs" style={{ fontFamily: "var(--font-sans)" }}>
              {anime.title_ru || anime.title_en}
            </span>
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)" }}
        />

        {anime.score && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5 z-[2]"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              padding: "3px 8px",
              borderRadius: 1,
              fontFamily: "var(--font-serif)",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "var(--cinnabar)" }}>★</span>
            {Number(anime.score).toFixed(1)}
          </div>
        )}

        <div
          className="absolute left-3 right-3 bottom-3 z-[2]"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1.15,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}
        >
          {anime.title_ru || anime.title_en}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div
          className="flex justify-between items-center"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
        >
          <span>{[anime.studio, anime.year].filter(Boolean).join(" · ") || "Anime"}</span>
          <span
            className="opacity-0 -translate-x-1.5 transition-all group-hover:opacity-100 group-hover:translate-x-0"
            style={{ color: "var(--ink)" }}
          >
            →
          </span>
        </div>

        {Array.isArray(anime.genres) && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {anime.genres.slice(0, 2).map((genre: string) => (
              <span
                key={genre}
                className="px-2 py-0.5"
                style={{ fontSize: 10, color: "var(--ash)", border: "1px solid var(--line)", borderRadius: 1 }}
              >
                {translateGenre(genre)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
