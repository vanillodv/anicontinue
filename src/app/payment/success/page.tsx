import Link from "next/link";
import { Heart, Sparkles, ArrowRight } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-[#0D0D1A] flex items-center justify-center py-16 px-6">
      <div className="max-w-lg w-full text-center">

        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 mb-8 mx-auto">
          <Heart className="w-12 h-12 text-[#E8409A]" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Спасибо за поддержку!</h1>
        <p className="text-gray-400 text-lg mb-4 max-w-md mx-auto">
          Твой донат помогает проекту жить и развиваться. Это очень важно для нас ❤️
        </p>
        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5 mb-10 text-sm text-gray-400 leading-relaxed">
          Чтобы получить генерации в подарок — напиши на{" "}
          <span className="text-[#E8409A]">support@anicontinue.ru</span>{" "}
          и укажи свой email в AniContinue. Добавим в течение 24 часов.
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg shadow-[#E8409A]/20"
          >
            <Sparkles className="w-5 h-5" />
            Начать создавать
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-8 rounded-full transition-all"
          >
            Мой профиль
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

      </div>
    </main>
  );
}
