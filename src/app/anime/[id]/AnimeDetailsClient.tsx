"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Calendar, Building2, Layers, Sparkles, RotateCcw, ArrowRight } from "lucide-react";
import { Anime } from "@/types";
import SceneConstructor from "@/components/reader/SceneConstructor";

interface AnimeDetailsClientProps {
  anime: Anime;
  lastChapter: { id: string, title: string | null } | null;
}

export default function AnimeDetailsClient({ anime, lastChapter }: AnimeDetailsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [continuePrevious, setContinuePrevious] = useState(false);

  const handleStart = (shouldContinue: boolean) => {
    setContinuePrevious(shouldContinue);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="w-full lg:w-1/3 shrink-0">
          <div className="relative aspect-[2/3] w-full rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            {anime.poster_url && (
              <Image src={anime.poster_url} alt={anime.title_ru || ""} fill className="object-cover" priority />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white">{anime.title_ru || anime.title_en}</h1>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(anime.genres) && anime.genres.map((genre: string) => (
                <span key={genre} className="px-3 py-1 bg-[#E8409A]/10 text-[#E8409A] rounded-full text-sm font-medium border border-[#E8409A]/20">{genre}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg text-yellow-400"><Star className="w-5 h-5 fill-yellow-400" /></div>
              <div><div className="text-xs text-gray-500 uppercase">Рейтинг</div><div className="font-bold">{anime.score || "N/A"}</div></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg text-blue-400"><Calendar className="w-5 h-5" /></div>
              <div><div className="text-xs text-gray-500 uppercase">Год</div><div className="font-bold">{anime.year || "N/A"}</div></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg text-purple-400"><Building2 className="w-5 h-5" /></div>
              <div><div className="text-xs text-gray-500 uppercase">Студия</div><div className="font-bold truncate max-w-[100px]">{anime.studio || "N/A"}</div></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg text-green-400"><Layers className="w-5 h-5" /></div>
              <div><div className="text-xs text-gray-500 uppercase">Серии</div><div className="font-bold">{anime.episodes || "N/A"}</div></div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-300 uppercase tracking-wider">Описание</h2>
            <p className="text-gray-400 leading-relaxed text-lg">{anime.synopsis}</p>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row gap-4">
            {lastChapter ? (
              <>
                <button
                  onClick={() => handleStart(true)}
                  className="bg-[#E8409A] hover:bg-[#d13589] text-white text-xl font-bold py-5 px-10 rounded-2xl shadow-lg shadow-[#E8409A]/20 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  Продолжить историю <ArrowRight className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handleStart(false)}
                  className="bg-white/5 hover:bg-white/10 text-white text-lg font-bold py-5 px-10 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <RotateCcw className="w-5 h-5" /> Начать заново
                </button>
              </>
            ) : (
              <button
                onClick={() => handleStart(false)}
                className="bg-[#E8409A] hover:bg-[#d13589] text-white text-xl font-bold py-5 px-12 rounded-2xl shadow-lg shadow-[#E8409A]/20 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <Sparkles className="w-6 h-6" /> Создать первую главу
              </button>
            )}
          </div>
        </div>
      </div>

      <SceneConstructor 
        animeId={anime.id} 
        animeTitle={anime.title_ru || ""} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        continuePrevious={continuePrevious}
        lastChapterTitle={lastChapter?.title}
        officialEndingContext={anime.ending_context}
      />
    </div>
  );
}
