"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, ChevronDown } from "lucide-react";
import Image from "next/image";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0D0D1A]/80 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Логотип */}
        <Link 
          href="/" 
          className="text-xl font-bold text-[#E8409A] hover:opacity-80 transition-opacity"
        >
          🌸 AniContinue
        </Link>

        {/* Навигация (скрыта на мобильных) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/catalog" 
            className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base"
          >
            Каталог
          </Link>
          <Link 
            href="/#how-it-works" 
            className="text-gray-300 hover:text-[#E8409A] transition-colors font-medium text-sm lg:text-base"
          >
            Как работает
          </Link>
        </nav>

        {/* Секция профиля */}
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
                    <Image 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E8409A]/20 flex items-center justify-center text-[#E8409A]">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
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
  );
}
