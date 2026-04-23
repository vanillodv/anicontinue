"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, ChevronDown, Shield, X, Menu, BookOpen, Eye, Wand2, Sparkles, Send } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "/catalog",   label: "Каталог" },
  { href: "/community", label: "Сообщество" },
  { href: "/feedback",  label: "Пожелания" },
  { href: "/pricing",   label: "Поддержка" },
];

interface HeaderProps {
  initialUser?: any;
  initialRole?: string | null;
}

export default function Header({ initialUser = null, initialRole = null }: HeaderProps) {
  const [user, setUser]               = useState<any>(initialUser);
  const [role, setRole]               = useState<string | null>(initialRole);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [howOpen, setHowOpen]         = useState(false);
  const supabase  = createClient();
  const pathname  = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    // Пропускаем первичный fetch — данные пришли через initialUser/initialRole из Server Layout.
    // Слушаем только auth-state-change чтобы обновиться при логине/логауте.
    const loadRole = async () => {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) { setRole(null); return; }
        const data = await res.json();
        setRole(data.role ?? null);
      } catch { setRole(null); }
    };

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
      <header
        className="sticky top-0 z-50 w-full ac-line-bottom backdrop-blur-md"
        style={{ background: "var(--header-bg)" }}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 md:gap-10 px-5 md:px-11 h-14 md:h-[72px]">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" style={{ fontFamily: "var(--font-serif)", fontWeight: 900 }}>
            <span className="ac-seal">続</span>
            <span className="text-[18px] md:text-[20px] tracking-[0.02em]" style={{ color: "var(--ink)" }}>AniContinue</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-8 justify-center" style={{ fontFamily: "var(--font-mono)" }}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative py-1.5 text-[13px] tracking-[0.08em] uppercase transition-opacity"
                style={{ color: "var(--ink)", opacity: 0.7 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => setHowOpen(true)}
              className="relative py-1.5 text-[13px] tracking-[0.08em] uppercase transition-opacity"
              style={{ color: "var(--ink)", opacity: 0.7 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
            >
              Как работает
            </button>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-[13px] tracking-[0.08em] uppercase transition-colors"
                style={{ color: "var(--gold)" }}
              >
                <Shield className="w-3.5 h-3.5" /> Админ
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-2.5">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 md:pl-3 transition-colors"
                  style={{ border: "1px solid var(--line-strong)", borderRadius: "2px", background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--rgb-ink),0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="text-[12px] md:text-[13px] tracking-[0.05em] uppercase hidden sm:inline max-w-[100px] truncate" style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                    {user.user_metadata.full_name || user.email?.split("@")[0]}
                  </span>
                  <div className="w-7 h-7 md:w-8 md:h-8 overflow-hidden relative shrink-0" style={{ borderRadius: "2px", border: "1px solid rgba(var(--rgb-cinnabar),0.35)" }}>
                    {user.user_metadata.avatar_url ? (
                      <Image src={user.user_metadata.avatar_url} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(var(--rgb-cinnabar),0.18)", color: "var(--cinnabar)" }}>
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} style={{ color: "var(--ash)" }} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 w-52 py-2 z-20 shadow-2xl"
                      style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", borderRadius: "2px" }}
                    >
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-[13px] tracking-[0.05em] uppercase transition-colors" style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }} onClick={() => setDropdownOpen(false)}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--rgb-ink),0.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <User className="w-4 h-4" /> Профиль
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-[13px] tracking-[0.05em] uppercase transition-colors" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }} onClick={() => setDropdownOpen(false)}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--rgb-gold),0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <Shield className="w-4 h-4" /> Админ панель
                        </Link>
                      )}
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] tracking-[0.05em] uppercase transition-colors" style={{ color: "var(--cinnabar)", fontFamily: "var(--font-mono)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--rgb-cinnabar),0.1)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <LogOut className="w-4 h-4" /> Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="ac-btn hidden sm:inline-flex">Войти</Link>
                <Link href="/login" className="ac-btn primary">
                  Начать <span className="arr">→</span>
                </Link>
              </>
            )}

            {/* Переключатель темы */}
            <ThemeToggle />

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 transition-colors"
              style={{ border: "1px solid var(--line-strong)", borderRadius: "2px", color: "var(--ink)" }}
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 left-0 right-0 shadow-2xl" style={{ background: "var(--paper)", borderBottom: "1px solid var(--line-strong)" }}>
            <div className="flex items-center justify-between px-5 h-14 ac-line-bottom">
              <Link href="/" className="flex items-center gap-2.5" style={{ fontFamily: "var(--font-serif)", fontWeight: 900 }} onClick={() => setMobileOpen(false)}>
                <span className="ac-seal">続</span>
                <span className="text-[18px]" style={{ color: "var(--ink)" }}>AniContinue</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-2" style={{ color: "var(--ash)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-1" style={{ fontFamily: "var(--font-mono)" }}>
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3.5 text-[13px] tracking-[0.1em] uppercase transition-colors"
                  style={{ color: "var(--ink)" }}
                  onClick={() => setMobileOpen(false)}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--rgb-ink),0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {label}
                </Link>
              ))}
              <button
                onClick={() => { setMobileOpen(false); setHowOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-[13px] tracking-[0.1em] uppercase text-left transition-colors"
                style={{ color: "var(--ink)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--rgb-ink),0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Как работает
              </button>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-3.5 text-[13px] tracking-[0.1em] uppercase transition-colors"
                  style={{ color: "var(--gold)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield className="w-4 h-4" /> Админ панель
                </Link>
              )}
            </nav>

            {user && (
              <div className="px-4 pb-5 ac-line-top pt-3 space-y-1" style={{ fontFamily: "var(--font-mono)" }}>
                <Link href="/profile" className="flex items-center gap-3 px-4 py-3.5 text-[13px] tracking-[0.1em] uppercase transition-colors" style={{ color: "var(--ink)" }} onClick={() => setMobileOpen(false)}>
                  <User className="w-4 h-4" /> Профиль
                </Link>
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3.5 text-[13px] tracking-[0.1em] uppercase text-left transition-colors" style={{ color: "var(--cinnabar)" }}>
                  <LogOut className="w-4 h-4" /> Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* How it works modal */}
      {howOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setHowOpen(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.8)" }} />
          <div
            className="relative w-full max-w-lg p-6 md:p-9 max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", borderRadius: "2px" }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setHowOpen(false)} className="absolute top-4 right-4 transition-colors" style={{ color: "var(--ash)" }}>
              <X className="w-5 h-5" />
            </button>
            <div className="ac-eyebrow mb-4"><span className="dot" /><span>01 · PROCESS</span><span className="line" /></div>
            <h2 className="text-2xl md:text-3xl mb-1" style={{ fontFamily: "var(--font-serif)", fontWeight: 900, color: "var(--ink)" }}>
              Как работает AniContinue
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--ash)" }}>5 шагов до готовой главы</p>
            <ol className="space-y-4">
              {[
                { icon: <BookOpen className="w-5 h-5" />, step: "一", title: "Выбери аниме", desc: "Открой Каталог и найди любимое аниме." },
                { icon: <Eye className="w-5 h-5" />, step: "二", title: "Изучи страницу", desc: "Описание, жанры, рейтинг и главы от других пользователей." },
                { icon: <Wand2 className="w-5 h-5" />, step: "三", title: "Нажми «Создать главу»", desc: "Укажи направление сюжета, персонажей и тон главы." },
                { icon: <Sparkles className="w-5 h-5" />, step: "四", title: "Создаём вместе", desc: "AI воплощает твою идею в полноценную фанфик-главу." },
                { icon: <Send className="w-5 h-5" />, step: "五", title: "Поделись с сообществом", desc: "Публикуй главу, собирай лайки и комментарии." },
              ].map(({ icon, step, title, desc }) => (
                <li key={step} className="flex gap-3 items-start">
                  <div
                    className="shrink-0 w-10 h-10 flex items-center justify-center"
                    style={{ background: "rgba(var(--rgb-cinnabar),0.12)", border: "1px solid rgba(var(--rgb-cinnabar),0.4)", borderRadius: "2px", color: "var(--cinnabar)", fontFamily: "var(--font-jp)", fontWeight: 900 }}
                  >
                    {step}
                  </div>
                  <div>
                    <p className="font-semibold leading-tight flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-serif)" }}>
                      {icon} {title}
                    </p>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--ash)" }}>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button onClick={() => setHowOpen(false)} className="ac-btn cinnabar mt-7 w-full justify-center">
              Попробовать <span className="arr">→</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
