"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import AnimeCard from "@/components/anime/AnimeCard";
import { Anime } from "@/types";

export default function CatalogPage() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchAnime() {
      setIsLoading(true);
      try {
        const url = debouncedQuery 
          ? `/api/anime/top?q=${encodeURIComponent(debouncedQuery)}`
          : `/api/anime/top`;
        
        const response = await fetch(url);
        const data = await response.json();
        setAnimeList(data);
      } catch (error) {
        console.error("Failed to fetch anime:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnime();
  }, [debouncedQuery]);

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <h1 className="text-4xl font-bold border-l-4 border-[#E8409A] pl-4">
          Каталог аниме
        </h1>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A2E] border border-white/5 rounded-full py-3 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/50 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <AnimeCard key={i} isLoading />
          ))
        ) : animeList.length > 0 ? (
          animeList.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">
            Ничего не найдено по вашему запросу.
          </div>
        )}
      </div>
    </div>
  );
}
