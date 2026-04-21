import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Ошибка входа",
  description: "Не удалось подтвердить аккаунт или истёк срок действия ссылки.",
};

export default function AuthErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center" style={{ minHeight: "calc(100vh - 72px)" }}>
      <div className="w-full max-w-md">
        <div className="p-10 text-center" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}>
          <div
            className="w-16 h-16 mx-auto mb-6 flex items-center justify-center"
            style={{ background: "rgba(232,93,79,0.12)", border: "1px solid var(--cinnabar)", color: "var(--cinnabar)", borderRadius: 2 }}
          >
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="ac-eyebrow mb-4 justify-center">
            <span className="dot" />
            <span>Ошибка · 認証エラー</span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(28px, 4vw, 40px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              marginBottom: 12,
            }}
          >
            Ошибка <b style={{ fontStyle: "normal", fontWeight: 900 }}>входа</b>
          </h1>
          <p className="mb-8" style={{ color: "var(--ash)", fontSize: 14, lineHeight: 1.55 }}>
            Не удалось подтвердить ваш аккаунт или истёк срок действия ссылки.
          </p>
          <Link href="/login" className="ac-btn cinnabar w-full justify-center">
            Попробовать снова <span className="arr">→</span>
          </Link>
        </div>
        <div className="text-center mt-6">
          <Link
            href="/"
            className="transition-colors"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}
          >
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}
