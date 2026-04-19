"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, ChevronDown, Shield, X, Sparkles, BookOpen, Send, Eye, Wand2 } from "lucide-react";
import Image from "next/image";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadRole = async () => {
      try {
        const res = await fetch('/api/user/me');
        if (!res.ok) { setRole(null); return; }
        const data = await res.json();
        setRole(data.role ?? null);
      } catch {
        setRole(null);
      }
    };

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) loadRole();
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadRole();
        } else {
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = () => {
    supabase.auth.signOut().finally(() => {
      window.location.replace('/');
    });
  };

  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <>
    <header className="sticky top-0 z-50 w-full bg-[#0D0D1A]/80 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Логотип */}
        <Link
          href="/"
          className="text-xl font-bold text-[#E8409A] hover:opacity-80 transition-opacity"
        >
          🌸 AniContinue
        </Link>

        {/* Навигация */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/catalog" className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base">
            Каталог
          </Link>
          <Link href="/community" className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base">
            Сообщество
          </Link>
          <Link href="/feedback" className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base">
            Пожелания
          </Link>
          <Link href="/pricing" className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base">
            Поддержка
          </Link>
          <button
            onClick={() => setHowOpen(true)}
            className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base"
          >
            Как работает
          </button>
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors font-medium text-sm lg:text-base">
              <Shield className="w-4 h-4" />
              Админ
            </Link>
          )}
        </nav>

        {/* Профиль */}
        <div className="flex items-center">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pl-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm font-medium text-gray-200 hidden sm:inline">
                  {user.user_metadata.full_name || user.email?.split('@')[0]}
                </span>
                <div className="w-8 h-8 rounded-full overflow-hidden relative border border-[#E8409A]/30">
                  {user.user_metadata.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#E8409A]/20 flex items-center justify-center text-[#E8409A]">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-[#1A1A2E] border border-white/10 rounded-2xl shadow-2xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Профиль
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Shield className="w-4 h-4" />
                        Админ панель
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2 rounded-full border border-white/20 text-[#E8409A] font-semibold hover:bg-white/5 transition-all text-sm lg:text-base"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>

    {/* How it works modal */}
    {howOpen && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={() => setHowOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Panel */}
        <div
          className="relative w-full max-w-lg bg-[#12122A] border border-white/10 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={() => setHowOpen(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-1">Как работает AniContinue</h2>
          <p className="text-gray-400 text-sm mb-8">5 шагов до готовой главы</p>

          <ol className="space-y-5">
            {[
              {
                icon: <BookOpen className="w-5 h-5" />,
                step: "1",
                title: "Выбери аниме",
                desc: "Открой Каталог и найди любимое аниме. Здесь собраны сотни произведений — от классики до новинок.",
              },
              {
                icon: <Eye className="w-5 h-5" />,
                step: "2",
                title: "Изучи страницу аниме",
                desc: "На странице аниме — описание, жанры, рейтинг и уже созданные фанфик-главы от других пользователей.",
              },
              {
                icon: <Wand2 className="w-5 h-5" />,
                step: "3",
                title: "Нажми «Создать главу»",
                desc: "Укажи направление сюжета: что должно произойти, какие персонажи задействованы, какой будет тон главы.",
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                step: "4",
                title: "Создаём главу вместе",
                desc: "AniContinue воплощает твою идею: вы вместе выстраиваете сюжет, диалоги и атмосферу — портал подхватывает твой замысел и делает его полноценной главой.",
              },
              {
                icon: <Send className="w-5 h-5" />,
                step: "5",
                title: "Поделись с сообществом",
                desc: "Опубликуй главу, получи лайки и комментарии. Читай работы других авторов в разделе Сообщество.",
              },
            ].map(({ icon, step, title, desc }) => (
              <li key={step} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 flex items-center justify-center text-[#E8409A]">
                  {icon}
                </div>
                <div>
                  <p className="text-white font-semibold leading-tight">{title}</p>
                  <p className="text-gray-400 text-sm mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <button
            onClick={() => setHowOpen(false)}
            className="mt-8 w-full bg-[#E8409A] hover:bg-[#d13589] text-white font-semibold py-3 rounded-full transition-colors"
          >
            Попробовать →
          </button>
        </div>
      </div>
    )}
    </>
  );
}
