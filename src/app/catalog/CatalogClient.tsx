"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import AnimeCard from "@/components/anime/AnimeCard";
import { Anime } from "@/types";

const PER_PAGE = 20;

export default function CatalogClient({ initialAnime }: { initialAnime: Anime[] }) {
  const [allAnime, setAllAnime] = useState<Anime[]>(initialAnime);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      setAllAnime(initialAnime);
      setPage(1);
      return;
    }
    setIsSearching(true);
    setSearchError(false);
    setPage(1);
    fetch(`/api/anime/top?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => { if (!r.ok) throw new Error('search failed'); return r.json(); })
      .then(data => { setAllAnime(Array.isArray(data) ? data : []); })
      .catch(() => { setSearchError(true); setAllAnime([]); })
      .finally(() => setIsSearching(false));
  }, [debouncedQuery, initialAnime]);

  const totalPages = Math.ceil(allAnime.length / PER_PAGE);
  const currentAnime = useMemo(
    () => allAnime.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [allAnime, page]
  );

  const changePage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Заголовок + поиск */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold border-l-4 border-[#E8409A] pl-4">Каталог аниме</h1>
          {!isSearching && (
            <p className="text-gray-500 text-sm mt-2 pl-5">
              {allAnime.length} аниме · страница {page} из {totalPages || 1}
            </p>
          )}
        </div>
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

      {/* Сетка */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 min-h-[400px]">
        {isSearching ? (
          Array.from({ length: PER_PAGE }).map((_, i) => <AnimeCard key={i} isLoading />)
        ) : currentAnime.length > 0 ? (
          currentAnime.map((anime) => <AnimeCard key={anime.id} anime={anime} />)
        ) : searchError ? (
          <div className="col-span-full py-20 text-center text-red-400">
            Ошибка поиска. Попробуй ещё раз.
          </div>
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">
            Ничего не найдено по вашему запросу.
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && !isSearching && (
        <div className="flex items-center justify-center gap-3 mt-16">
          <button
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isActive = p === page;
              const isNear = Math.abs(p - page) <= 2;
              const isEdge = p === 1 || p === totalPages;
              if (!isNear && !isEdge) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} className="text-gray-600 px-1">…</span>;
                }
                return null;
              }
              return (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-[#E8409A] text-white shadow-lg shadow-[#E8409A]/30'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => changePage(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            Вперёд
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
