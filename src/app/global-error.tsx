"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#0D0D1A] text-white flex items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">🔥</div>
          <h1 className="text-3xl font-black">Критическая ошибка</h1>
          <p className="text-gray-400">{error.message || "Приложение аварийно завершило работу."}</p>
          <button onClick={reset} className="px-6 py-3 bg-[#E8409A] hover:bg-[#d13589] rounded-xl font-bold transition-all">
            Перезапустить
          </button>
        </div>
      </body>
    </html>
  );
}
