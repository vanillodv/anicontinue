"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, ChevronDown, Shield, X, Sparkles, BookOpen, Send, Eye, Wand2, Menu } from "lucide-react";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/catalog",   label: "Каталог" },
  { href: "/community", label: "Сообщество" },
  { href: "/feedback",  label: "Пожелания" },
  { href: "/pricing",   label: "Поддержка" },
];

export default function Header() {
  const [user, setUser]               = useState<any>(null);
  const [role, setRole]               = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [howOpen, setHowOpen]         = useState(false);
  const supabase  = createClient();
  const pathname  = usePathname();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) { setRole(null); return; }
        const data = await res.json();
        setRole(data.role ?? null);
      } catch { setRole(null); }
    };

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) loadRole();
    };
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRole(); else setRole(null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = () => {
    supabase.auth.signOut().finally(() => window.location.replace("/"));
  };

  const isAdmin = role === "admin" || role === "super_admin";

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#0D0D1A]/90 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">

          {/* Логотип */}
          <Link href="/" className="text-lg md:text-xl font-bold text-[#E8409A] hover:opacity-80 transition-opacity shrink-0">
            🌸 AniContinue
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base">
                {label}
              </Link>
            ))}
            <button onClick={() => setHowOpen(true)} className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base">
              Как работает
            </button>
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors font-medium text-sm">
                <Shield className="w-4 h-4" /> Админ
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 md:pl-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-200 hidden sm:inline max-w-[100px] truncate">
                    {user.user_metadata.full_name || user.email?.split("@")[0]}
                  </span>
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden relative border border-[#E8409A]/30 shrink-0">
                    {user.user_metadata.avatar_url ? (
                      <Image src={user.user_metadata.avatar_url} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#E8409A]/20 flex items-center justify-center text-[#E8409A]">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-[#1A1A2E] border border-white/10 rounded-2xl shadow-2xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors" onClick={() => setDropdownOpen(false)}>
                        <User className="w-4 h-4" /> Профиль
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors" onClick={() => setDropdownOpen(false)}>
                          <Shield className="w-4 h-4" /> Админ панель
                        </Link>
                      )}
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-4 h-4" /> Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-4 md:px-6 py-2 rounded-full border border-white/20 text-[#E8409A] font-semibold hover:bg-white/5 transition-all text-sm">
                Войти
              </Link>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu drawer ───────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />

          {/* Panel */}
          <div className="absolute top-0 left-0 right-0 bg-[#0D0D1A] border-b border-white/10 shadow-2xl animate-in slide-in-from-top duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/5">
              <Link href="/" className="text-lg font-bold text-[#E8409A]" onClick={() => setMobileOpen(false)}>
                🌸 AniContinue
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="p-4 space-y-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all font-medium text-base"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <button
                onClick={() => { setMobileOpen(false); setHowOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all font-medium text-base text-left"
              >
                Как работает
              </button>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-yellow-400 hover:bg-yellow-500/10 transition-all font-medium text-base"
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield className="w-4 h-4" /> Админ панель
                </Link>
              )}
            </nav>

            {/* User section */}
            {user && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-1">
                <Link href="/profile" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-300 hover:bg-white/5 transition-all" onClick={() => setMobileOpen(false)}>
                  <User className="w-4 h-4" /> Профиль
                </Link>
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
                  <LogOut className="w-4 h-4" /> Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── How it works modal ───────────────────────────── */}
      {howOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setHowOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-[#12122A] border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setHowOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Как работает AniContinue</h2>
            <p className="text-gray-400 text-sm mb-6">5 шагов до готовой главы</p>
            <ol className="space-y-4">
              {[
                { icon: <BookOpen className="w-5 h-5" />, step: "1", title: "Выбери аниме", desc: "Открой Каталог и найди любимое аниме." },
                { icon: <Eye className="w-5 h-5" />, step: "2", title: "Изучи страницу", desc: "Описание, жанры, рейтинг и главы от других пользователей." },
                { icon: <Wand2 className="w-5 h-5" />, step: "3", title: "Нажми «Создать главу»", desc: "Укажи направление сюжета, персонажей и тон главы." },
                { icon: <Sparkles className="w-5 h-5" />, step: "4", title: "Создаём вместе", desc: "AI воплощает твою идею в полноценную фанфик-главу." },
                { icon: <Send className="w-5 h-5" />, step: "5", title: "Поделись с сообществом", desc: "Публикуй главу, собирай лайки и комментарии." },
              ].map(({ icon, step, title, desc }) => (
                <li key={step} className="flex gap-3 items-start">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 flex items-center justify-center text-[#E8409A]">
                    {icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold leading-tight">{title}</p>
                    <p className="text-gray-400 text-sm mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button onClick={() => setHowOpen(false)} className="mt-6 w-full bg-[#E8409A] hover:bg-[#d13589] text-white font-semibold py-3 rounded-full transition-colors">
              Попробовать →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
