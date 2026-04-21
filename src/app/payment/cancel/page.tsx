import type { Metadata } from "next";
import Link from "next/link";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Оплата отменена",
  description: "Платёж отменён. Ничего не списано. Можете попробовать снова в любое время.",
};

export default function PaymentCancelPage() {
  return (
    <div className="flex items-center justify-center py-16 px-6" style={{ minHeight: "calc(100vh - 72px)" }}>
      <div className="max-w-lg w-full text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 mb-8"
          style={{ background: "rgba(232,93,79,0.1)", border: "1px solid var(--cinnabar)", color: "var(--cinnabar)", borderRadius: 2 }}
        >
          <XCircle className="w-10 h-10" />
        </div>

        <div className="ac-eyebrow mb-5 justify-center">
          <span className="dot" />
          <span>キャンセル · Cancelled</span>
        </div>

        <h1
          className="mb-5"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(32px, 5vw, 56px)",
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          Оплата <b style={{ fontStyle: "normal", fontWeight: 900 }}>отменена</b>
        </h1>
        <p className="max-w-md mx-auto mb-10" style={{ color: "var(--ash)", fontSize: 16, lineHeight: 1.6 }}>
          Вы отменили платёж. Ничего не списано. Можете попробовать снова в любое время.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <Link href="/pricing" className="ac-btn cinnabar">
            <CreditCard className="w-3.5 h-3.5" /> Попробовать снова
          </Link>
          <Link href="/profile" className="ac-btn">
            <ArrowLeft className="w-3.5 h-3.5" /> В профиль
          </Link>
        </div>
      </div>
    </div>
  );
}
