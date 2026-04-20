import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/admin/guard";
import { Sparkles, BookOpen, Users, Star, ArrowRight, Wand2, Send, Heart, MessageCircle, Zap } from "lucide-react";
import { proxyImage } from "@/lib/proxyImage";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const svc = serviceClient(); // обходит RLS для чтения username из profiles

  const [
    { data: popularAnime },
    { count: animeCount },
    { count: chaptersCount },
    { data: recentChapters },
  ] = await Promise.all([
    supabase
      .from("anime")
      .select("id, title_ru, title_en, poster_url, score, genres")
      .order("score", { ascending: false })
      .limit(8),
    supabase.from("anime").select("*", { count: "exact", head: true }),
    supabase
      .from("chapters")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("is_deleted", false),
    svc
      .from("chapters")
      .select(`
        id, title, content, likes_count, created_at,
        anime ( title_ru, poster_url ),
        profiles!chapters_user_id_fkey ( username )
      `)
      .eq("is_public", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const stats = [
    { value: `${animeCount ?? 0}+`, label: "аниме в каталоге", icon: BookOpen, color: "text-blue-400" },
    { value: `${chaptersCount ?? 0}+`, label: "глав написано", icon: Sparkles, color: "text-[#E8409A]" },
    { value: "∞", label: "возможностей", icon: Zap, color: "text-yellow-400" },
  ];

  const steps = [
    { icon: BookOpen, title: "Выбери аниме", desc: "Более 100 тайтлов — от классики до новинок сезона" },
    { icon: Wand2, title: "Задай направление", desc: "Настроение, тип сцены, персонажи — всё под твой замысел" },
    { icon: Sparkles, title: "Создаём вместе", desc: "AI воплощает твою идею в полноценную фанфик-главу" },
    { icon: Send, title: "Делись с миром", desc: "Публикуй, собирай лайки и комментарии от сообщества" },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Poster collage background */}
        <div className="absolute inset-0 flex gap-1 opacity-25 saturate-50 scale-110 blur-[2px] pointer-events-none">
          {(popularAnime ?? []).map((a, i) => (
            <div key={a.id} className="flex-1 relative" style={{ transform: `translateY(${i % 2 === 0 ? '-5%' : '5%'})` }}>
              {a.poster_url && (
                <Image src={proxyImage(a.poster_url)!} alt="" fill className="object-cover" sizes="200px" />
              )}
            </div>
          ))}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D1A] via-[#0D0D1A]/85 to-[#0D0D1A]/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D1A] via-transparent to-[#0D0D1A]/60 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 py-16 md:py-32 max-w-6xl">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 text-[#E8409A] text-sm font-semibold mb-6 md:mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Фанфики нового поколения
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-none mb-5 md:mb-6 tracking-tight">
              Продолжи<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8409A] to-[#ff6eb4]">
                своё аниме
              </span>
            </h1>

            <p className="text-base md:text-xl text-gray-300 leading-relaxed mb-8 md:mb-10 max-w-lg">
              Создавай фанфик-главы вместе с AI — в атмосфере оригинала, с любимыми персонажами, за считанные секунды.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-2xl shadow-[#E8409A]/30 text-lg"
              >
                <Sparkles className="w-5 h-5" />
                Начать бесплатно
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold py-4 px-8 rounded-2xl transition-all text-lg"
              >
                <Users className="w-5 h-5" />
                Сообщество
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#12122A]/60 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-3 divide-x divide-white/5">
            {stats.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="py-5 md:py-8 px-2 sm:px-6 text-center">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${color} mx-auto mb-2 md:mb-3 opacity-80`} />
                <div className={`text-2xl md:text-4xl font-black ${color} mb-0.5 md:mb-1`}>{value}</div>
                <div className="text-gray-500 text-xs md:text-sm leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-14 md:py-24 container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4">Как это работает</h2>
          <p className="text-gray-400 text-base md:text-lg">Четыре шага до готовой главы</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-[#E8409A]/30 to-transparent z-0" />
              )}
              <div className="relative z-10 bg-[#1A1A2E] border border-white/5 group-hover:border-[#E8409A]/30 rounded-2xl p-6 text-center transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-2xl bg-[#E8409A]/10 border border-[#E8409A]/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#E8409A]/20 transition-all">
                  <Icon className="w-6 h-6 text-[#E8409A]" />
                </div>
                <div className="text-xs font-bold text-[#E8409A]/60 uppercase tracking-widest mb-2">Шаг {i + 1}</div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── POPULAR ANIME ────────────────────────────────────────────── */}
      <section className="py-10 md:py-16 bg-[#0A0A18]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-4xl font-black">Популярные аниме</h2>
              <p className="text-gray-500 text-sm mt-1">Самые рейтинговые тайтлы каталога</p>
            </div>
            <Link
              href="/catalog"
              className="flex items-center gap-2 text-[#E8409A] hover:text-[#ff6eb4] font-semibold transition-colors group"
            >
              Весь каталог
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {(popularAnime ?? []).map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                className="group relative"
              >
                <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-lg border border-white/5 group-hover:border-[#E8409A]/40 transition-all duration-300">
                  {anime.poster_url ? (
                    <Image
                      src={proxyImage(anime.poster_url)!}
                      alt={anime.title_ru || ""}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-white text-xs font-bold leading-tight line-clamp-2">
                      {anime.title_ru || anime.title_en}
                    </p>
                    {anime.score && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold">{anime.score}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT CHAPTERS ──────────────────────────────────────────── */}
      {(recentChapters ?? []).length > 0 && (
        <section className="py-14 md:py-24 container mx-auto px-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-4xl font-black">Свежие главы</h2>
              <p className="text-gray-500 text-sm mt-1">Последние работы от сообщества</p>
            </div>
            <Link
              href="/community"
              className="flex items-center gap-2 text-[#E8409A] hover:text-[#ff6eb4] font-semibold transition-colors group"
            >
              Все главы
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(recentChapters as any[]).map((ch) => {
              const preview = ch.content?.replace(/\n+/g, " ").slice(0, 140).trim();
              return (
                <Link
                  key={ch.id}
                  href={`/chapter/${ch.id}`}
                  className="group bg-[#1A1A2E] border border-white/5 hover:border-[#E8409A]/30 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
                >
                  {/* Anime poster banner */}
                  {ch.anime?.poster_url && (
                    <div className="relative h-28 overflow-hidden">
                      <Image
                        src={proxyImage(ch.anime.poster_url)!}
                        alt=""
                        fill
                        className="object-cover object-top opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                        sizes="400px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] to-transparent" />
                      <div className="absolute bottom-2 left-4">
                        <span className="text-xs font-bold text-[#E8409A] bg-[#1A1A2E]/80 px-2 py-0.5 rounded-full">
                          {ch.anime.title_ru}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <h3 className="text-white font-bold leading-snug group-hover:text-[#E8409A] transition-colors line-clamp-2">
                      {ch.title || "Без названия"}
                    </h3>
                    {preview && (
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 flex-1">
                        {preview}…
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-white/5">
                      <span>{(ch.profiles as any)?.username ?? "Аноним"}</span>
                      <div className="flex items-center gap-3">
                        {ch.likes_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-400" />{ch.likes_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ───────────────────────────────────────────────── */}
      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative bg-gradient-to-br from-[#E8409A]/20 via-[#1A1A2E] to-[#7B61FF]/20 border border-[#E8409A]/20 rounded-3xl p-6 sm:p-8 md:p-12 text-center overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#E8409A]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 text-[#E8409A] text-sm font-semibold mb-6">
                <Star className="w-3.5 h-3.5 fill-[#E8409A]" />
                3 главы бесплатно
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4">
                Готов написать свою историю?
              </h2>
              <p className="text-gray-400 text-sm md:text-lg mb-6 md:mb-8 max-w-xl mx-auto">
                Зарегистрируйся и получи 3 бесплатные генерации прямо сейчас — без карты, без подписки.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/catalog"
                  className="inline-flex items-center justify-center gap-2 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-4 px-10 rounded-2xl transition-all transform hover:scale-105 shadow-2xl shadow-[#E8409A]/30 text-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Попробовать бесплатно
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-10 rounded-2xl transition-all text-lg"
                >
                  Поддержать проект
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
