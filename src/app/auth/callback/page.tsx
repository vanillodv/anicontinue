"use client";

// Клиентский callback — exchangeCodeForSession выполняется в браузере,
// где code_verifier доступен (хранится браузерным Supabase-клиентом).
// Серверный Route Handler не мог его найти, потому что verifier не передавался в cookie.

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const code = searchParams.get("code");

    if (!code) {
      router.replace("/");
      return;
    }

    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Браузерный клиент знает code_verifier — обмениваем код на сессию.
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Auth callback error:", error.message);
          router.replace("/auth/auth-code-error");
          return;
        }

        if (data?.session) {
          // После успешного входа вызываем сервер для создания/проверки профиля.
          // Сессионные куки уже выставлены браузерным клиентом.
          const res = await fetch("/api/auth/after-oauth", { method: "POST" });

          if (res.status === 403) {
            const body = await res.json().catch(() => ({}));
            router.replace(body.redirectTo ?? "/auth/registration-closed");
            return;
          }
        }

        router.replace("/");
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        router.replace("/auth/auth-code-error");
      }
    };

    handleCallback();
  }, []);

  return null;
}

function LoadingSpinner() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "calc(100vh - 72px)" }}
    >
      <div className="text-center space-y-4">
        <div
          className="ac-seal"
          style={{ width: 48, height: 48, fontSize: 28, margin: "0 auto", opacity: 0.7 }}
        >
          続
        </div>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--ash)",
          }}
        >
          Авторизация...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CallbackHandler />
      <LoadingSpinner />
    </Suspense>
  );
}
