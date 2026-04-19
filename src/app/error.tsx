"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">💥</div>
        <h1 className="text-3xl font-black text-white">Что-то пошло не так</h1>
        <p className="text-gray-400">{error.message || "Произошла непредвиденная ошибка."}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-[#E8409A] hover:bg-[#d13589] rounded-xl font-bold transition-all">
            Попробовать снова
          </button>
          <Link href="/" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
