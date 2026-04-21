"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Star, Heart, MessageCircle, ChevronDown,
  Globe, Lock, Search, SlidersHorizontal
} from "lucide-react";
import { proxyImage } from "@/lib/proxyImage";

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
  return params?.mood ?? null;
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
    <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-4 text-left transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(242,235,217,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="relative w-11 h-15 overflow-hidden shrink-0" style={{ borderRadius: 1, height: 60 }}>
          {group.posterUrl ? (
            <Image src={proxyImage(group.posterUrl)!} alt={group.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--line)", color: "var(--ash)", fontFamily: "var(--font-jp)", fontWeight: 900 }}>
              続
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/anime/${group.animeId}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate block transition-colors"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cinnabar)" }}
          >
            {group.title}
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
              {group.chapters.length} {plural(group.chapters.length, "глава", "главы", "глав")}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ash)" }}>
              последняя — {timeAgo(group.lastDate)}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--ash)" }}
        />
      </button>

      {open && (
        <div className="divide-y" style={{ borderTop: "1px solid var(--line)" }}>
          {group.chapters.map((ch) => {
            const mood = moodLabel(ch.scene_params);
            return (
              <div
                key={ch.id}
                className="flex items-center gap-3 px-4 py-3 group transition-colors"
                style={{ borderTop: "1px solid var(--line)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(242,235,217,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="shrink-0" style={{ color: ch.is_public ? "#86EFAC" : "var(--ash)" }}>
                  {ch.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                    {ch.title || "Без названия"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ash)" }}>
                    <span>{timeAgo(ch.created_at)}</span>
                    {mood && (
                      <span style={{ border: "1px solid var(--line-strong)", padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        {mood}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                  {ch.rating != null && (
                    <div className="flex items-center gap-1" style={{ color: "var(--gold)" }}>
                      <Star className="w-3 h-3" style={{ fill: "var(--gold)" }} />
                      {ch.rating}
                    </div>
                  )}
                  {ch.likes_count > 0 && (
                    <div className="flex items-center gap-1" style={{ color: "var(--cinnabar)" }}>
                      <Heart className="w-3 h-3" />
                      {ch.likes_count}
                    </div>
                  )}
                  {(ch.comments_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1" style={{ color: "var(--ash)" }}>
                      <MessageCircle className="w-3 h-3" />
                      {ch.comments_count}
                    </div>
                  )}
                </div>

                <Link
                  href={`/chapter/${ch.id}`}
                  className="shrink-0 p-2 opacity-0 group-hover:opacity-100 transition-all"
                  style={{ border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cinnabar)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--cinnabar)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.borderColor = "var(--line-strong)"; }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
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

  const totalLikes    = chapters.reduce((s, c) => s + c.likes_count, 0);
  const totalPublic   = chapters.filter((c) => c.is_public).length;
  const animeCount    = new Set(chapters.map((c) => c.anime?.id)).size;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-10" style={{ border: "1px solid var(--line-strong)" }}>
        {[
          { label: "Всего глав",    value: chapters.length },
          { label: "Аниме",         value: animeCount,      accent: "cinnabar" },
          { label: "Публичных",     value: totalPublic,     accent: "green" },
          { label: "Лайков всего",  value: totalLikes,      accent: "gold" },
        ].map(({ label, value, accent }, i) => (
          <div
            key={label}
            className="px-5 py-4"
            style={{
              background: "var(--paper-2)",
              borderRight: i < 3 ? "1px solid var(--line)" : "none",
              borderBottom: i < 2 && i > -1 ? "none" : undefined,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 900,
                fontSize: 28,
                letterSpacing: "-0.02em",
                color:
                  accent === "cinnabar" ? "var(--cinnabar)" :
                  accent === "gold" ? "var(--gold)" :
                  accent === "green" ? "#86EFAC" : "var(--ink)",
              }}
            >
              {value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ash)", marginTop: 4 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ash)" }} />
          <input
            type="text"
            placeholder="Поиск по названию или аниме…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 focus:outline-none"
            style={{
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.1em",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
          />
        </div>

        <div className="flex gap-1 p-1" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", borderRadius: 2 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 transition-all"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: filter === f.key ? "var(--ink)" : "transparent",
                color: filter === f.key ? "var(--paper)" : "var(--ink)",
                borderRadius: 1,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSort((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 transition-colors"
            style={{
              background: "transparent",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {SORTS.find((s) => s.key === sort)?.label}
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 top-full mt-1 py-1 z-20 min-w-[160px]" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}>
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => { setSort(s.key); setShowSort(false); }}
                    className="w-full text-left px-4 py-2 transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: sort === s.key ? "var(--cinnabar)" : "var(--ink)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Empty */}
      {groups.length === 0 && (
        <div
          className="py-24 flex flex-col items-center text-center gap-5"
          style={{ background: "var(--paper-2)", border: "1px dashed var(--line-strong)" }}
        >
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{ background: "rgba(232,93,79,0.1)", border: "1px solid rgba(232,93,79,0.35)", color: "var(--cinnabar)", fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 26 }}
          >
            続
          </div>
          {query || filter !== "all" ? (
            <>
              <p style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 20, color: "var(--ink)" }}>Ничего не найдено</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ash)" }}>
                Попробуйте изменить фильтры или поисковый запрос
              </p>
              <button
                onClick={() => { setQuery(""); setFilter("all"); }}
                className="underline"
                style={{ color: "var(--cinnabar)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                Сбросить фильтры
              </button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 20, color: "var(--ink)" }}>Глав пока нет</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ash)" }}>
                Выберите аниме в каталоге и создайте первую главу
              </p>
              <Link href="/catalog" className="ac-btn cinnabar">В каталог <span className="arr">→</span></Link>
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
