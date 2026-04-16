"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Globe, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error("Пароли не совпадают");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        if (error) throw error;
        setError("Проверьте почту для подтверждения регистрации!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/catalog");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-500">
        <Link href="/" className="inline-block">
          <h1 className="text-5xl font-bold text-[#E8409A] drop-shadow-[0_0_15px_rgba(232,64,154,0.3)]">
            🌸 AniContinue
          </h1>
        </Link>

        <div className="bg-[#1A1A2E] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('google')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'google' ? 'text-[#E8409A] bg-white/5 border-b-2 border-[#E8409A]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Google
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'email' ? 'text-[#E8409A] bg-white/5 border-b-2 border-[#E8409A]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Email
            </button>
          </div>

          <div className="p-8 space-y-6 text-left">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">
                {isRegister ? "Создать аккаунт" : "С возвращением"}
              </h2>
              <p className="text-gray-400 text-sm">
                {isRegister ? "Начни свое приключение сегодня" : "Войдите, чтобы продолжить историю"}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'google' ? (
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-100 py-4 px-6 rounded-2xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Globe className="w-5 h-5" />
                Продолжить через Google
              </button>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/50 transition-all"
                    />
                  </div>
                </div>

                {isRegister && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Подтвердите пароль</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#E8409A] hover:bg-[#d13589] disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    isRegister ? "Зарегистрироваться" : "Войти"
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-sm text-gray-400 hover:text-[#E8409A] transition-colors"
                  >
                    {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-[#E8409A] font-medium bg-[#E8409A]/5 py-3 rounded-xl inline-block px-6">
                ✨ 3 главы бесплатно каждый месяц
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-500 text-[10px] md:text-xs">
          Продолжая, вы соглашаетесь с условиями обслуживания AniContinue
        </p>
      </div>
    </main>
  );
}
