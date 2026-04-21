import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Спасибо за поддержку",
  description: "Ваш донат получен. Мы добавим генерации в течение 24 часов как знак благодарности.",
};

export default function PaymentSuccessPage() {
  return (
    <div className="flex items-center justify-center py-16 px-6" style={{ minHeight: "calc(100vh - 72px)" }}>
      <div className="max-w-lg w-full text-center">
        <div
          className="inline-flex items-center justify-center w-24 h-24 mb-8"
          style={{ background: "var(--cinnabar)", color: "#fff", borderRadius: 2, boxShadow: "0 0 40px rgba(232,93,79,0.35)" }}
        >
          <Heart className="w-12 h-12" />
        </div>

        <div className="ac-eyebrow mb-5 justify-center">
          <span className="dot" />
          <span>感謝 · Thank you</span>
        </div>

        <h1
          className="mb-5"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(36px, 5vw, 64px)",
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          Спасибо за <b style={{ fontStyle: "normal", fontWeight: 900 }}>поддержку!</b>
        </h1>
        <p className="max-w-md mx-auto mb-6" style={{ color: "var(--ash)", fontSize: 16, lineHeight: 1.6 }}>
          Твой донат помогает проекту жить и развиваться. Это очень важно для нас.
        </p>

        <div
          className="mb-10 p-5 text-left"
          style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", borderLeft: "3px solid var(--cinnabar)" }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cinnabar)", marginBottom: 8 }}>
            Что дальше
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)", opacity: 0.85 }}>
            Чтобы получить генерации в подарок — напиши на{" "}
            <span style={{ color: "var(--cinnabar)" }}>support@anicontinue.ru</span>{" "}
            и укажи свой email в AniContinue. Добавим в течение 24 часов.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <Link href="/catalog" className="ac-btn cinnabar">
            Начать создавать <span className="arr">→</span>
          </Link>
          <Link href="/profile" className="ac-btn">Мой профиль</Link>
        </div>
      </div>
    </div>
  );
}
