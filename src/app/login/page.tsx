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
  const [activeTab, setActiveTab] = useState<"social" | "email">("social");
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
      provider: "google",
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
        const settingsRes = await fetch("/api/settings/public");
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

  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--line-strong)",
    borderRadius: 2,
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6" style={{ minHeight: "calc(100vh - 72px)" }}>
      <div className="w-full max-w-md text-center">
        {/* Brand */}
        <Link href="/" className="inline-flex items-center gap-3 mb-10" style={{ fontFamily: "var(--font-serif)", fontWeight: 900 }}>
          <span className="ac-seal" style={{ width: 40, height: 40, fontSize: 22 }}>続</span>
          <span className="text-3xl" style={{ color: "var(--ink)" }}>AniContinue</span>
        </Link>

        {/* Card */}
        <div className="text-left" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}>
          {/* Tabs */}
          <div className="grid grid-cols-2" style={{ borderBottom: "1px solid var(--line-strong)", fontFamily: "var(--font-mono)" }}>
            <button
              onClick={() => setActiveTab("social")}
              className="py-4 transition-all text-xs tracking-[0.2em] uppercase"
              style={{
                color: activeTab === "social" ? "var(--cinnabar)" : "var(--ash)",
                borderBottom: activeTab === "social" ? "2px solid var(--cinnabar)" : "2px solid transparent",
                background: activeTab === "social" ? "rgba(232,93,79,0.05)" : "transparent",
              }}
            >
              Соцсети
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className="py-4 transition-all text-xs tracking-[0.2em] uppercase"
              style={{
                color: activeTab === "email" ? "var(--cinnabar)" : "var(--ash)",
                borderBottom: activeTab === "email" ? "2px solid var(--cinnabar)" : "2px solid transparent",
                background: activeTab === "email" ? "rgba(232,93,79,0.05)" : "transparent",
              }}
            >
              Email
            </button>
          </div>

          <div className="p-8 space-y-5">
            <div className="text-center mb-4">
              <div className="ac-eyebrow mb-3 justify-center">
                <span className="dot" />
                <span>{isRegister && activeTab === "email" ? "Регистрация" : "Вход"}</span>
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 28, color: "var(--ink)" }}>
                {activeTab === "email" && isRegister ? "Создать аккаунт" : "С возвращением"}
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--ash)" }}>
                {activeTab === "email" && isRegister
                  ? "Начни своё приключение сегодня"
                  : "Войдите, чтобы продолжить историю"}
              </p>
            </div>

            {error && (
              <div
                className="flex items-start gap-3 p-4 text-sm"
                style={{
                  border: error.includes("подтверждения") ? "1px solid rgba(74,222,128,0.4)" : "1px solid var(--cinnabar)",
                  background: error.includes("подтверждения") ? "rgba(74,222,128,0.08)" : "rgba(232,93,79,0.08)",
                  color: error.includes("подтверждения") ? "#86efac" : "var(--cinnabar)",
                  borderRadius: 2,
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === "social" ? (
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 transition-all"
                style={{
                  background: "#fff",
                  color: "var(--paper)",
                  borderRadius: 2,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                <GoogleIcon />
                Войти через Google
              </button>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block mb-2" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ash)" }} />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full py-3 pl-11 pr-4 focus:outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                    Пароль
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ash)" }} />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 pl-11 pr-4 focus:outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
                    />
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block mb-2" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                      Подтвердите пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ash)" }} />
                      <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full py-3 pl-11 pr-4 focus:outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
                      />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="ac-btn cinnabar w-full justify-center disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegister ? "Зарегистрироваться" : "Войти"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="transition-colors"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cinnabar)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ash)")}
                  >
                    {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-5 text-center" style={{ borderTop: "1px solid var(--line)" }}>
              <div
                className="inline-flex items-center gap-2 px-4 py-2.5"
                style={{
                  background: "rgba(232,93,79,0.08)",
                  border: "1px solid rgba(232,93,79,0.3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--cinnabar)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cinnabar)" }} />
                3 главы бесплатно для каждого
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
          Продолжая, вы соглашаетесь с условиями AniContinue
        </p>
      </div>
    </div>
  );
}
