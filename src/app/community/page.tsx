"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Heart, MessageCircle, Clock, Flame, TrendingUp } from "lucide-react";

interface CommunityChapter {
  id: string;
  title: string | null;
  preview: string;
  created_at: string;
  anime_id: number;
  user_id: string;
  likes_count: number;
  comments_count: number;
  anime_title: string | null;
  poster_url: string | null;
  username: string | null;
}

type SortKey = 'new' | 'popular' | 'rating';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'new',     label: 'Новое',       icon: <Clock className="w-4 h-4" /> },
  { key: 'popular', label: 'Популярное',  icon: <Flame className="w-4 h-4" /> },
  { key: 'rating',  label: 'По рейтингу', icon: <TrendingUp className="w-4 h-4" /> },
];

function SkeletonCard() {
  return (
    <div className="bg-[#1A1A2E] rounded-xl border border-[#252540] p-5 flex flex-col gap-3 animate-pulse">
      <div className="h-5 w-24 bg-white/10 rounded-full" />
      <div className="h-6 w-3/4 bg-white/10 rounded-md" />
      <div className="h-4 w-full bg-white/5 rounded-md" />
      <div className="h-4 w-2/3 bg-white/5 rounded-md" />
      <div className="mt-auto pt-3 flex justify-between">
        <div className="h-4 w-20 bg-white/5 rounded-md" />
        <div className="h-4 w-16 bg-white/5 rounded-md" />
      </div>
      <div className="h-10 w-full bg-white/10 rounded-lg" />
    </div>
  );
}

export default function CommunityPage() {
  const [chapters, setChapters] = useState<CommunityChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('new');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likePending, setLikePending] = useState<Set<string>>(new Set());

  const fetchChapters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community?sort=${sort}`);
      if (!res.ok) throw new Error('Ошибка загрузки ленты');
      setChapters(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sort]);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);

  const handleLike = async (chapterId: string) => {
    if (likePending.has(chapterId)) return;
    setLikePending(prev => new Set(prev).add(chapterId));

    try {
      const res = await fetch(`/api/chapter/${chapterId}/like`, { method: 'POST' });
      if (res.status === 401) return; // не залогинен — ничего не делаем
      const data = await res.json();

      setLikedIds(prev => {
        const next = new Set(prev);
        data.liked ? next.add(chapterId) : next.delete(chapterId);
        return next;
      });

      setChapters(prev => prev.map(c =>
        c.id === chapterId ? { ...c, likes_count: data.likes_count } : c
      ));
    } finally {
      setLikePending(prev => { const next = new Set(prev); next.delete(chapterId); return next; });
    }
  };

  const sorted = [...chapters].sort((a, b) => {
    if (sort === 'popular') return b.likes_count - a.likes_count;
    if (sort === 'rating')  return b.likes_count - a.likes_count; // пока нет avg_rating в API
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <main className="min-h-screen bg-[#0D0D1A] text-white py-16">
      <div className="container mx-auto px-6 max-w-6xl">

        {/* Заголовок */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">🌐 Сообщество</h1>
          <p className="text-gray-400 text-lg">Читайте истории, созданные другими фанатами</p>
        </div>

        {/* Фильтры */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                sort === opt.key
                  ? 'bg-[#E8409A] border-[#E8409A] text-white shadow-lg shadow-[#E8409A]/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* Ошибка */}
        {error && (
          <div className="py-20 text-center">
            <p className="text-red-400 text-lg">{error}</p>
            <button
              onClick={fetchChapters}
              className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Скелетоны */}
        {isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Пустая лента */}
        {!isLoading && !error && chapters.length === 0 && (
          <div className="py-28 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <BookOpen className="w-9 h-9 text-gray-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Пока нет опубликованных глав</h2>
              <p className="text-gray-500">Станьте первым!</p>
            </div>
            <Link href="/catalog" className="px-8 py-3 bg-[#E8409A] hover:bg-[#d13589] rounded-full font-bold shadow-lg shadow-[#E8409A]/20 transition-all">
              Создать историю
            </Link>
          </div>
        )}

        {/* Лента */}
        {!isLoading && !error && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(chapter => (
              <article
                key={chapter.id}
                className="bg-[#1A1A2E] rounded-xl border border-[#252540] p-5 flex flex-col gap-3 hover:border-[#E8409A]/30 transition-colors"
              >
                {chapter.anime_title && (
                  <span className="self-start px-3 py-1 rounded-full text-xs font-bold bg-[#E8409A]/10 text-[#E8409A] border border-[#E8409A]/20 truncate max-w-full">
                    {chapter.anime_title}
                  </span>
                )}

                <h2 className="text-white font-bold text-lg leading-snug line-clamp-2">
                  {chapter.title || 'Без названия'}
                </h2>

                {chapter.preview && (
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 flex-1">
                    {chapter.preview}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
                  <span className="truncate max-w-[60%]">{chapter.username ?? 'Аноним'}</span>
                  <span>{new Date(chapter.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/chapter/${chapter.id}`}
                    className="flex-1 text-center bg-[#7B61FF] hover:bg-[#6545e0] text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
                  >
                    Читать
                  </Link>
                  <button
                    onClick={() => handleLike(chapter.id)}
                    disabled={likePending.has(chapter.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      likedIds.has(chapter.id)
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-red-500/30 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedIds.has(chapter.id) ? 'fill-red-400' : ''}`} />
                    {chapter.likes_count > 0 && chapter.likes_count}
                  </button>
                  <Link
                    href={`/chapter/${chapter.id}#comments`}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-[#E8409A] hover:border-[#E8409A]/30 text-sm font-medium transition-all"
                    title="Комментарии"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {chapter.comments_count > 0 && chapter.comments_count}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
