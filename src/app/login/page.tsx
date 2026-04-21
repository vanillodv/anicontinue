"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'social' | 'email'>('social');
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
        // Проверяем разрешена ли регистрация
        const settingsRes = await fetch('/api/settings/public');
        const settings = await settingsRes.json();
        if (!settings.registration_enabled) {
          throw new Error("Регистрация временно приостановлена. Попробуйте позже.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setError("Проверьте почту для подтверждения регистрации!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
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
          {/* Табы */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('social')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'social' ? 'text-[#E8409A] bg-white/5 border-b-2 border-[#E8409A]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Соцсети
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'email' ? 'text-[#E8409A] bg-white/5 border-b-2 border-[#E8409A]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Email
            </button>
          </div>

          <div className="p-8 space-y-4 text-left">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold text-white">
                {activeTab === 'email' && isRegister ? "Создать аккаунт" : "С возвращением"}
              </h2>
              <p className="text-gray-400 text-sm">
                {activeTab === 'email' && isRegister ? "Начни своё приключение сегодня" : "Войдите, чтобы продолжить историю"}
              </p>
            </div>

            {error && (
              <div className={`border p-4 rounded-xl text-sm flex items-start gap-3 ${
                error.includes('подтверждения')
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'social' ? (
              <div className="space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-100 py-3.5 px-6 rounded-2xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <GoogleIcon />
                  Войти через Google
                </button>
              </div>
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isRegister ? "Зарегистрироваться" : "Войти"}
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

            <div className="pt-4 border-t border-white/5 text-center">
              <p className="text-xs text-[#E8409A] font-medium bg-[#E8409A]/5 py-3 rounded-xl inline-block px-6">
                ✨ 3 главы бесплатно для каждого
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
