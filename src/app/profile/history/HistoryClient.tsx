"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Star, Heart, MessageCircle, ChevronDown,
  BookOpen, Globe, Lock, Search, SlidersHorizontal, Sparkles
} from "lucide-react";

interface Chapter {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  rating: number | null;
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  scene_params: any;
  anime: {
    id: number;
    title_ru: string | null;
    title_en: string | null;
    poster_url: string | null;
  } | null;
}

interface AnimeGroup {
  animeId: number;
  title: string;
  posterUrl: string | null;
  chapters: Chapter[];
  lastDate: string;
}

type FilterKey = "all" | "public" | "private";
type SortKey = "date" | "anime" | "likes";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",     label: "Все"        },
  { key: "public",  label: "Публичные"  },
  { key: "private", label: "Приватные"  },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "date",  label: "По дате"    },
  { key: "anime", label: "По аниме"   },
  { key: "likes", label: "По лайкам"  },
];

function moodLabel(params: any): string | null {
  const mood = params?.mood;
  const map: Record<string, string> = {
    Экшн: "⚔️ Экшн", Драма: "🌧️ Драма", Романтика: "🌸 Романтика", Юмор: "😄 Юмор",
  };
  return mood ? (map[mood] ?? mood) : null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function AnimeSection({ group, defaultOpen }: { group: AnimeGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
      {/* Anime header — clickable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/3 transition-colors text-left"
      >
        {/* Poster */}
        <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 shadow-lg">
          {group.posterUrl ? (
            <Image src={group.posterUrl} alt={group.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-gray-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/anime/${group.animeId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[#E8409A] text-xs font-bold uppercase tracking-wider hover:underline truncate block"
          >
            {group.title}
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-white font-semibold text-sm">
              {group.chapters.length} {plural(group.chapters.length, "глава", "главы", "глав")}
            </span>
            <span className="text-gray-600 text-xs">последняя — {timeAgo(group.lastDate)}</span>
          </div>
        </div>

        <ChevronDown
          className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Chapters list */}
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {group.chapters.map((ch) => {
            const mood = moodLabel(ch.scene_params);
            return (
              <div
                key={ch.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors group"
              >
                {/* Status dot */}
                <div className="shrink-0 mt-0.5">
                  {ch.is_public ? (
                    <Globe className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </div>

                {/* Main */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {ch.title || "Без названия"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-gray-600 text-xs">{timeAgo(ch.created_at)}</span>
                    {mood && (
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {mood}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 shrink-0">
                  {ch.rating != null && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {ch.rating}
                    </div>
                  )}
                  {ch.likes_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Heart className="w-3 h-3 text-red-400" />
                      {ch.likes_count}
                    </div>
                  )}
                  {(ch.comments_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MessageCircle className="w-3 h-3 text-[#E8409A]" />
                      {ch.comments_count}
                    </div>
                  )}
                </div>

                {/* Read button */}
                <Link
                  href={`/chapter/${ch.id}`}
                  className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-[#E8409A] text-white transition-all opacity-0 group-hover:opacity-100"
                  title="Читать"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HistoryClient({ chapters }: { chapters: Chapter[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort]     = useState<SortKey>("date");
  const [query, setQuery]   = useState("");
  const [showSort, setShowSort] = useState(false);

  // Filter chapters
  const filtered = useMemo(() => {
    let list = chapters;
    if (filter === "public")  list = list.filter((c) => c.is_public);
    if (filter === "private") list = list.filter((c) => !c.is_public);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          (c.title ?? "").toLowerCase().includes(q) ||
          (c.anime?.title_ru ?? "").toLowerCase().includes(q) ||
          (c.anime?.title_en ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [chapters, filter, query]);

  // Group by anime
  const groups = useMemo<AnimeGroup[]>(() => {
    const map = new Map<number, AnimeGroup>();
    for (const ch of filtered) {
      const id = ch.anime?.id ?? -1;
      if (!map.has(id)) {
        map.set(id, {
          animeId: id,
          title: ch.anime?.title_ru || ch.anime?.title_en || "Неизвестное аниме",
          posterUrl: ch.anime?.poster_url ?? null,
          chapters: [],
          lastDate: ch.created_at,
        });
      }
      const g = map.get(id)!;
      g.chapters.push(ch);
      if (ch.created_at > g.lastDate) g.lastDate = ch.created_at;
    }

    const list = Array.from(map.values());

    // Sort groups
    if (sort === "date")  list.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    if (sort === "anime") list.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    if (sort === "likes") {
      list.sort((a, b) => {
        const sumA = a.chapters.reduce((s, c) => s + c.likes_count, 0);
        const sumB = b.chapters.reduce((s, c) => s + c.likes_count, 0);
        return sumB - sumA;
      });
    }

    return list;
  }, [filtered, sort]);

  // Summary stats
  const totalLikes    = chapters.reduce((s, c) => s + c.likes_count, 0);
  const totalPublic   = chapters.filter((c) => c.is_public).length;
  const animeCount    = new Set(chapters.map((c) => c.anime?.id)).size;

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Всего глав",    value: chapters.length,  color: "text-[#E8409A]" },
          { label: "Аниме",         value: animeCount,        color: "text-purple-400" },
          { label: "Публичных",     value: totalPublic,       color: "text-green-400"  },
          { label: "Лайков всего",  value: totalLikes,        color: "text-red-400"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1A1A2E] border border-white/5 rounded-2xl px-5 py-4 text-center">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по названию или аниме…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E8409A]/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1 bg-[#1A1A2E] border border-white/10 rounded-xl p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-[#E8409A] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSort((v) => !v)}
            className="flex items-center gap-2 bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {SORTS.find((s) => s.key === sort)?.label}
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[#12122A] border border-white/10 rounded-xl shadow-2xl py-1 z-20 min-w-[140px]">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => { setSort(s.key); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      sort === s.key ? "text-[#E8409A]" : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="py-24 flex flex-col items-center text-center gap-5 bg-[#1A1A2E] border border-dashed border-white/10 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-[#E8409A]" />
          </div>
          {query || filter !== "all" ? (
            <>
              <p className="text-white font-semibold">Ничего не найдено</p>
              <p className="text-gray-500 text-sm">Попробуйте изменить фильтры или поисковый запрос</p>
              <button onClick={() => { setQuery(""); setFilter("all"); }} className="text-sm text-[#E8409A] hover:underline">
                Сбросить фильтры
              </button>
            </>
          ) : (
            <>
              <p className="text-white font-semibold">Глав пока нет</p>
              <p className="text-gray-500 text-sm">Выберите аниме в каталоге и создайте первую главу</p>
              <Link href="/catalog" className="px-6 py-2.5 bg-[#E8409A] hover:bg-[#d13589] text-white text-sm font-bold rounded-full transition-all">
                В каталог
              </Link>
            </>
          )}
        </div>
      )}

      {/* Groups */}
      <div className="space-y-3">
        {groups.map((g, i) => (
          <AnimeSection key={g.animeId} group={g} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
