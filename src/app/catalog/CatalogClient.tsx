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
    <div style={{ padding: "64px 44px 120px" }}>
      {/* ── HEAD ──────────────────────────────────────────── */}
      <div className="grid gap-8 items-end mb-14" style={{ gridTemplateColumns: "auto 1fr auto" }}>
        <div className="ac-sec-num hidden md:block">零弐</div>
        <div className="ac-sec-title">
          <div className="kicker">02 · Catalog</div>
          <h2>Каталог <b>аниме</b></h2>
          {!isSearching && (
            <p className="mt-3" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
              {allAnime.length} тайтл{allAnime.length % 10 === 1 && allAnime.length % 100 !== 11 ? "" : allAnime.length % 10 >= 2 && allAnime.length % 10 <= 4 && (allAnime.length % 100 < 10 || allAnime.length % 100 >= 20) ? "а" : "ов"} · Страница {page} / {totalPages || 1}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-96" style={{ justifySelf: "end" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ash)" }} />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pl-12 pr-5 focus:outline-none transition-all"
            style={{
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--line-strong)")}
          />
        </div>
      </div>

      {/* ── GRID ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 min-h-[400px]">
        {isSearching ? (
          Array.from({ length: PER_PAGE }).map((_, i) => <AnimeCard key={i} isLoading />)
        ) : currentAnime.length > 0 ? (
          currentAnime.map((anime) => <AnimeCard key={anime.id} anime={anime} />)
        ) : searchError ? (
          <div className="col-span-full py-20 text-center" style={{ color: "var(--cinnabar)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Ошибка поиска. Попробуй ещё раз.
          </div>
        ) : (
          <div className="col-span-full py-20 text-center" style={{ color: "var(--ash)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Ничего не найдено по вашему запросу
          </div>
        )}
      </div>

      {/* ── PAGINATION ────────────────────────────────────── */}
      {totalPages > 1 && !isSearching && (
        <div className="flex items-center justify-center gap-3 mt-16" style={{ fontFamily: "var(--font-mono)" }}>
          <button
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-2 px-5 py-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--ink)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Назад
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isActive = p === page;
              const isNear = Math.abs(p - page) <= 2;
              const isEdge = p === 1 || p === totalPages;
              if (!isNear && !isEdge) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} style={{ color: "var(--ash)", padding: "0 4px" }}>…</span>;
                }
                return null;
              }
              return (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className="w-10 h-10 font-bold text-sm transition-all"
                  style={
                    isActive
                      ? { background: "var(--ink)", color: "var(--paper)", borderRadius: 2, fontFamily: "var(--font-serif)", fontWeight: 900 }
                      : { background: "transparent", color: "var(--ash)", borderRadius: 2, border: "1px solid var(--line-strong)" }
                  }
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => changePage(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-5 py-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--ink)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Вперёд
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 40px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
