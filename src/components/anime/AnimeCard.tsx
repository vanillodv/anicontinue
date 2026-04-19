"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Star } from "lucide-react";
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
        <div className="aspect-[2/3] w-full bg-[#1A1A2E] rounded-2xl animate-pulse" />
        <div className="h-5 w-3/4 bg-[#1A1A2E] rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[#1A1A2E] rounded animate-pulse" />
      </div>
    );
  }

  if (!anime) return null;

  const posterSrc = proxyImage(anime.poster_url);
  const showImage = posterSrc && !imgError;

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group flex flex-col gap-3 transition-transform duration-300 hover:scale-105"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[#1A1A2E] border border-white/5 shadow-xl">
        {showImage ? (
          <Image
            src={posterSrc!}
            alt={anime.title_en || "Anime poster"}
            fill
            className="object-cover transition-opacity duration-300 group-hover:opacity-80"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-600 px-4 text-center">
            <span className="text-3xl">🎌</span>
            <span className="text-xs">{anime.title_ru || anime.title_en}</span>
          </div>
        )}

        {anime.score && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#0D0D1A]/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-xs font-bold text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400" />
            {anime.score}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-sm md:text-base line-clamp-2 group-hover:text-[#E8409A] transition-colors leading-tight">
          {anime.title_ru || anime.title_en}
        </h3>

        <div className="flex flex-wrap gap-1 mt-1">
          {Array.isArray(anime.genres) && anime.genres.slice(0, 2).map((genre: string) => (
            <span key={genre} className="text-[10px] md:text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              {translateGenre(genre)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
