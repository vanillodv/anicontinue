import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-black text-[#E8409A]/20">404</div>
        <h1 className="text-3xl font-black text-white">Страница не найдена</h1>
        <p className="text-gray-400">Эта глава не существует или была удалена.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/catalog" className="px-6 py-3 bg-[#E8409A] hover:bg-[#d13589] rounded-xl font-bold transition-all">
            В каталог
          </Link>
          <Link href="/" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
