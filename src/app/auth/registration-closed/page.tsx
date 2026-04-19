import Link from "next/link";

export default function RegistrationClosedPage() {
  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">🔒</div>
      <h1 className="text-3xl font-black text-white mb-4">Регистрация закрыта</h1>
      <p className="text-gray-400 max-w-md">
        В данный момент регистрация новых пользователей приостановлена. Попробуй позже или войди в существующий аккаунт.
      </p>
      <Link
        href="/login"
        className="mt-8 px-6 py-3 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold rounded-xl transition-all"
      >
        Войти в аккаунт
      </Link>
    </div>
  );
}
