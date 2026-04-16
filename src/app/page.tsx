import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Anime } from "@/types";

export default async function Home() {
  const supabase = await createClient();

  // Загружаем топ-3 аниме по рейтингу
  const { data: popularAnime } = await supabase
    .from('anime')
    .select('id, title_ru, title_en, poster_url, synopsis')
    .order('score', { ascending: false })
    .limit(3) as { data: Anime[] | null };

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-white font-sans selection:bg-[#E8409A]/30">
      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-[#E8409A] drop-shadow-[0_0_15px_rgba(232,64,154,0.3)]">
          🌸 AniContinue
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Продолжи своё любимое аниме с помощью AI. Создавай новые главы и сюжетные повороты за считанные секунды.
        </p>
        
        <Link 
          href="/catalog" 
          className="inline-block bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-[#E8409A]/20"
        >
          Попробовать бесплатно
        </Link>

        {/* Popular Anime Grid */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold mb-12 text-left border-l-4 border-[#E8409A] pl-4">
            Популярные аниме
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {popularAnime && popularAnime.map((anime) => (
              <Link
                href={`/anime/${anime.id}`}
                key={anime.id} 
                className="group relative overflow-hidden rounded-2xl bg-[#1A1A2E] border border-white/5 hover:border-[#E8409A]/50 transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[16/9] w-full overflow-hidden relative">
                  {anime.poster_url ? (
                    <Image 
                      src={anime.poster_url} 
                      alt={anime.title_ru || anime.title_en || ""}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                </div>
                <div className="p-6 text-left flex flex-col flex-grow">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-[#E8409A] transition-colors">
                    {anime.title_ru || anime.title_en}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-3">
                    {anime.synopsis}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Footer-like spacer */}
      <footer className="py-10 text-center text-gray-500 text-sm border-t border-white/5">
        &copy; {new Date().getFullYear()} AniContinue. Все права защищены.
      </footer>
    </div>
  );
}
