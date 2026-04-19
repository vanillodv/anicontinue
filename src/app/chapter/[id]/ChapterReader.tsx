"use client";

import { useState, useEffect } from "react";
import { Star, Heart, ChevronRight, Home, LayoutGrid, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Chapter, Anime } from "@/types";
import CommentsSection from "@/components/chapter/CommentsSection";

interface ChapterReaderProps {
  chapter: Chapter;
  anime: Pick<Anime, 'id' | 'title_ru' | 'title_en' | 'poster_url'>;
}

export default function ChapterReader({ chapter, anime }: ChapterReaderProps) {
  const [rating, setRating] = useState(chapter.rating || 0);
  const [isRating, setIsRating] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(chapter.likes_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/api/chapter/${chapter.id}/like`);
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      }
    };
    fetchLikeStatus();
  }, [chapter.id, supabase]);

  const handleRate = async (value: number) => {
    if (isRating) return;
    setIsRating(true);
    try {
      await fetch(`/api/chapter/${chapter.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      setRating(value);
    } catch {
      // silently ignore
    } finally {
      setIsRating(false);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikesCount(c => c + (optimisticLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/chapter/${chapter.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      } else {
        // rollback
        setLiked(!optimisticLiked);
        setLikesCount(c => c + (optimisticLiked ? -1 : 1));
      }
    } catch {
      setLiked(!optimisticLiked);
      setLikesCount(c => c + (optimisticLiked ? -1 : 1));
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-gray-200 py-12">
      <div className="container mx-auto px-6 max-w-4xl">

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-12 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/" className="hover:text-[#E8409A] flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            Главная
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/catalog" className="hover:text-[#E8409A] flex items-center gap-1 transition-colors">
            <LayoutGrid className="w-3.5 h-3.5" />
            Каталог
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/anime/${anime.id}`} className="hover:text-[#E8409A] transition-colors">
            {anime.title_ru || anime.title_en}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-300 truncate">
            {chapter.title || "Глава"}
          </span>
        </nav>

        {/* Header */}
        <header className="mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {chapter.title || "Новая глава"}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 italic">
            <span>{anime.title_ru || anime.title_en}</span>
            <span>•</span>
            <span>{new Date(chapter.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Content */}
        <article className="max-w-[680px] mx-auto mb-20">
          <div
            className="font-serif text-[18px] leading-[1.8] space-y-8 text-gray-300 selection:bg-[#E8409A]/30"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {chapter.content.split('\n').map((paragraph, idx) => (
              paragraph.trim() && (
                <p key={idx}>
                  {paragraph}
                </p>
              )
            ))}
          </div>
        </article>

        {/* Footer Actions */}
        <footer className="max-w-[680px] mx-auto border-t border-white/5 pt-12 text-center space-y-12">

          {/* Like + Rating */}
          <div className="space-y-6 bg-[#1A1A2E] p-8 rounded-3xl border border-white/5">
            <h3 className="text-xl font-bold text-white">Понравилась глава?</h3>

            {/* Like button */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all font-semibold text-sm disabled:opacity-50 ${
                  liked
                    ? 'bg-[#E8409A]/20 border-[#E8409A] text-[#E8409A]'
                    : 'border-white/10 text-gray-400 hover:border-[#E8409A]/50 hover:text-[#E8409A]'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-[#E8409A]' : ''}`} />
                {likesCount > 0 ? likesCount : 'Нравится'}
              </button>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  disabled={isRating}
                  className="p-1 transition-transform hover:scale-125 active:scale-90 disabled:opacity-50"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link
              href={`/anime/${anime.id}`}
              className="bg-[#E8409A] hover:bg-[#d13589] text-white px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-[#E8409A]/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Создать ещё одну главу
            </Link>
            <Link
              href="/catalog"
              className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Вернуться в каталог
            </Link>
          </div>
        </footer>

        {/* Comments */}
        <CommentsSection chapterId={chapter.id} />

      </div>
    </div>
  );
}
