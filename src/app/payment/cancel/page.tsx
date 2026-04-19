import Link from "next/link";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-[#0D0D1A] flex items-center justify-center py-16 px-6">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 mb-8 mx-auto">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Оплата отменена</h1>
        <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
          Вы отменили платёж. Ничего не списано. Можете попробовать снова в любое время.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg shadow-[#E8409A]/20"
          >
            <CreditCard className="w-5 h-5" />
            Попробовать снова
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-8 rounded-full transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            В профиль
          </Link>
        </div>
      </div>
    </main>
  );
}
