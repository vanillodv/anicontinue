import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="bg-[#1A1A2E] p-10 rounded-3xl border border-white/5 shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Ошибка входа</h1>
            <p className="text-gray-400">
              Не удалось подтвердить ваш аккаунт или истёк срок действия ссылки.
            </p>
          </div>

          <Link
            href="/login"
            className="block w-full bg-[#E8409A] hover:bg-[#d13589] text-white py-4 px-6 rounded-2xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Попробовать снова
          </Link>
        </div>
        
        <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm">
          Вернуться на главную
        </Link>
      </div>
    </main>
  );
}
