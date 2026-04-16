import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, Crown, BookOpen, Star, ArrowRight, Sparkles } from "lucide-react";
import { Profile, Chapter, Anime } from "@/types";

interface ExtendedChapter extends Chapter {
  anime: Pick<Anime, 'title_ru' | 'title_en' | 'poster_url'>;
}

export default async function ProfilePage() {
  const supabase = await createClient();

  // 1. Проверка авторизации
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  // 2. Получение профиля
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile };

  // 3. Получение последних 10 глав с join на anime
  const { data: chapters } = await supabase
    .from('chapters')
    .select(`
      *,
      anime (
        title_ru,
        title_en,
        poster_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10) as { data: ExtendedChapter[] | null };

  const chaptersUsed = profile?.chapters_used || 0;
  const chaptersLimit = profile?.chapters_limit || 3;
  const progressPercent = Math.min((chaptersUsed / chaptersLimit) * 100, 100);

  return (
    <main className="min-h-screen bg-[#0D0D1A] py-12">
      <div className="container mx-auto px-6 max-w-5xl space-y-12">
        
        {/* Header Профиля */}
        <section className="flex flex-col md:flex-row items-center gap-8 bg-[#1A1A2E] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[#E8409A]/30 shrink-0 shadow-[0_0_20px_rgba(232,64,154,0.2)]">
            {user.user_metadata.avatar_url ? (
              <Image 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                fill 
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#E8409A]/20 flex items-center justify-center text-[#E8409A]">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>
          
          <div className="flex-grow text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
                {user.user_metadata.full_name || user.email?.split('@')[0]}
                <span className="px-3 py-1 bg-[#E8409A]/10 text-[#E8409A] border border-[#E8409A]/20 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  {profile?.plan || 'Free'}
                </span>
              </h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#E8409A]" />
                <span className="text-sm font-medium text-gray-300">
                  {chaptersUsed} глав создано
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Счётчик глав */}
        <section className="bg-[#1A1A2E] p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E8409A]" />
                Лимит генераций
              </h2>
              <p className="text-gray-400 text-sm">
                Использовано {chaptersUsed} из {chaptersLimit} глав в этом месяце
              </p>
            </div>
            <button className="bg-[#E8409A] hover:bg-[#d13589] text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-[#E8409A]/20">
              Улучшить план 🚀
            </button>
          </div>
          
          <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-[#E8409A] to-[#ff6eb4] rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* История глав */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold border-l-4 border-[#E8409A] pl-4">История ваших приключений</h2>
          
          <div className="grid gap-4">
            {chapters && chapters.length > 0 ? (
              chapters.map((chapter) => (
                <div 
                  key={chapter.id} 
                  className="group bg-[#1A1A2E] p-4 rounded-2xl border border-white/5 hover:border-[#E8409A]/30 transition-all flex items-center gap-6"
                >
                  <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-lg">
                    {chapter.anime?.poster_url ? (
                      <Image 
                        src={chapter.anime.poster_url} 
                        alt="Anime" 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5" />
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="text-xs text-[#E8409A] font-bold uppercase mb-1 truncate">
                      {chapter.anime?.title_ru || chapter.anime?.title_en}
                    </div>
                    <h3 className="text-lg font-bold text-white truncate mb-1">
                      {chapter.title || "Глава без названия"}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(chapter.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3 fill-yellow-500" />
                        <span>{chapter.rating || "Без оценки"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/chapter/${chapter.id}`}
                    className="p-3 bg-white/5 hover:bg-[#E8409A] text-white rounded-xl transition-all group-hover:translate-x-1"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-[#1A1A2E] rounded-3xl border border-white/5 border-dashed">
                <p className="text-gray-500 mb-6">Вы еще не создали ни одной главы.</p>
                <Link 
                  href="/catalog"
                  className="inline-block bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-full font-bold transition-all border border-white/10"
                >
                  Перейти в каталог
                </Link>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
