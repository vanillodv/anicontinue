import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, BookOpen, Star, ArrowRight, Sparkles, Heart, Globe, Lock } from "lucide-react";
import { Profile, Chapter, Anime } from "@/types";

interface ExtendedChapter extends Chapter {
  anime: Pick<Anime, 'id' | 'title_ru' | 'title_en' | 'poster_url'>;
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const [
    { data: profile },
    { data: chapters },
    { data: likesReceived },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single() as any,
    supabase.from('chapters').select('*, anime(id, title_ru, title_en, poster_url)')
      .eq('user_id', user.id).eq('is_deleted', false)
      .order('created_at', { ascending: false }).limit(20) as any,
    supabase.from('chapters').select('likes_count').eq('user_id', user.id).eq('is_deleted', false),
  ]).catch(() => [{ data: null }, { data: [] }, { data: [] }]) as any[];

  const typedProfile = profile as Profile;
  const typedChapters = (chapters ?? []) as ExtendedChapter[];

  const chaptersUsed = typedProfile?.chapters_used || 0;
  const chaptersLimit = typedProfile?.chapters_limit || 3;
  const progressPercent = Math.min((chaptersUsed / chaptersLimit) * 100, 100);
  const totalLikes = (likesReceived ?? []).reduce((s: number, c: any) => s + (c.likes_count ?? 0), 0);
  const avgRating = typedChapters.filter(c => c.rating).length > 0
    ? (typedChapters.filter(c => c.rating).reduce((s, c) => s + (c.rating ?? 0), 0) / typedChapters.filter(c => c.rating).length).toFixed(1)
    : '—';

  return (
    <main className="min-h-screen bg-[#0D0D1A] py-8 md:py-12">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl space-y-6 md:space-y-10">

        {/* Шапка профиля */}
        <section className="flex flex-col md:flex-row items-center gap-5 md:gap-8 bg-[#1A1A2E] p-5 md:p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[#E8409A]/30 shrink-0 shadow-[0_0_20px_rgba(232,64,154,0.2)]">
            {user.user_metadata.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="Avatar" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-[#E8409A]/20 flex items-center justify-center text-[#E8409A]">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-3 flex-wrap">
                {user.user_metadata.full_name || user.email?.split('@')[0]}
                <span className="px-3 py-1 bg-[#E8409A]/10 text-[#E8409A] border border-[#E8409A]/20 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {(typedProfile?.chapters_limit ?? 3) > 3 ? 'Меценат' : 'Участник'}
                </span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">{user.email}</p>
            </div>

            {/* Статистика */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              {[
                { icon: BookOpen, label: `${chaptersUsed} глав`, color: 'text-[#E8409A]' },
                { icon: Heart,    label: `${totalLikes} лайков`, color: 'text-red-400' },
                { icon: Star,     label: `${avgRating} рейтинг`, color: 'text-yellow-400' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm font-medium text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/settings" className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-gray-300 transition-all text-center">
              Настройки
            </Link>
            <Link href="/profile/history" className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-gray-300 transition-all text-center">
              История
            </Link>
          </div>
        </section>

        {/* Лимит генераций */}
        <section className="bg-[#1A1A2E] p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E8409A]" />
                Доступные генерации
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Использовано {chaptersUsed} из {chaptersLimit} · первые 3 всегда бесплатно
              </p>
            </div>
            <Link href="/pricing" className="bg-[#E8409A] hover:bg-[#d13589] text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-[#E8409A]/20 text-center">
              Поддержать проект ❤️
            </Link>
          </div>
          <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#E8409A] to-[#ff6eb4] rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* История глав — сгруппировано по аниме */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold border-l-4 border-[#E8409A] pl-4">Мои главы</h2>
            {typedChapters.length > 0 && (
              <Link href="/profile/history" className="text-sm text-gray-500 hover:text-[#E8409A] transition-colors">
                Все главы →
              </Link>
            )}
          </div>

          {typedChapters.length === 0 ? (
            <div className="py-20 text-center bg-[#1A1A2E] rounded-3xl border border-white/5 border-dashed">
              <Sparkles className="w-10 h-10 text-[#E8409A]/40 mx-auto mb-4" />
              <p className="text-gray-500 mb-6">Вы ещё не создали ни одной главы.</p>
              <Link href="/catalog" className="inline-block bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-full font-bold transition-all border border-white/10">
                Перейти в каталог
              </Link>
            </div>
          ) : (() => {
            // Group chapters by anime (up to 4 groups, 3 chapters each)
            const groups = new Map<number, { title: string; posterUrl: string | null; animeId: number; chapters: ExtendedChapter[] }>();
            for (const ch of typedChapters) {
              const aid = (ch.anime as any)?.id ?? -1;
              if (!groups.has(aid)) {
                groups.set(aid, {
                  animeId: aid,
                  title: ch.anime?.title_ru || ch.anime?.title_en || "Неизвестное аниме",
                  posterUrl: ch.anime?.poster_url ?? null,
                  chapters: [],
                });
              }
              groups.get(aid)!.chapters.push(ch);
            }
            const groupList = Array.from(groups.values()).slice(0, 4);

            return (
              <div className="space-y-4">
                {groupList.map((g) => (
                  <div key={g.animeId} className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
                    {/* Anime header */}
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5">
                      <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0">
                        {g.posterUrl ? (
                          <Image src={g.posterUrl} alt={g.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/anime/${g.animeId}`} className="text-[#E8409A] text-sm font-bold hover:underline truncate block">
                          {g.title}
                        </Link>
                        <span className="text-gray-600 text-xs">{g.chapters.length} {g.chapters.length === 1 ? 'глава' : g.chapters.length < 5 ? 'главы' : 'глав'}</span>
                      </div>
                      <Link href="/profile/history" className="text-xs text-gray-500 hover:text-[#E8409A] transition-colors shrink-0">
                        Все →
                      </Link>
                    </div>

                    {/* Chapters list */}
                    <div className="divide-y divide-white/5">
                      {g.chapters.slice(0, 3).map((chapter) => (
                        <div key={chapter.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                          <div className="shrink-0">
                            {chapter.is_public
                              ? <Globe className="w-3.5 h-3.5 text-green-400" />
                              : <Lock className="w-3.5 h-3.5 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{chapter.title || 'Без названия'}</p>
                            <p className="text-gray-600 text-xs mt-0.5">
                              {new Date(chapter.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {chapter.rating && (
                              <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <Star className="w-3 h-3 fill-yellow-400" />{chapter.rating}
                              </span>
                            )}
                            {chapter.likes_count > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Heart className="w-3 h-3 text-red-400" />{chapter.likes_count}
                              </span>
                            )}
                          </div>
                          <Link href={`/chapter/${chapter.id}`} className="opacity-0 group-hover:opacity-100 p-2 bg-white/5 hover:bg-[#E8409A] rounded-lg transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {groups.size > 4 && (
                  <Link href="/profile/history" className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm text-gray-400 hover:text-white transition-all">
                    Показать все аниме <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            );
          })()}
        </section>
      </div>
    </main>
  );
}
