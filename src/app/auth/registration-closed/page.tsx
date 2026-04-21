import Link from "next/link";

export default function RegistrationClosedPage() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center" style={{ minHeight: "calc(100vh - 72px)" }}>
      <div className="w-full max-w-md">
        <div className="p-10 text-center" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}>
          <div
            className="w-20 h-20 mx-auto mb-6 flex items-center justify-center"
            style={{ background: "rgba(232,93,79,0.12)", border: "1px solid rgba(232,93,79,0.4)", color: "var(--cinnabar)", fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 40, borderRadius: 2 }}
          >
            閉
          </div>
          <div className="ac-eyebrow mb-4 justify-center">
            <span className="dot" />
            <span>Регистрация закрыта · 登録停止</span>
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
              marginBottom: 14,
            }}
          >
            Регистрация <b style={{ fontStyle: "normal", fontWeight: 900 }}>приостановлена</b>
          </h1>
          <p className="mb-8" style={{ color: "var(--ash)", fontSize: 14, lineHeight: 1.6 }}>
            В данный момент регистрация новых пользователей временно приостановлена.
            Попробуйте позже или войдите в существующий аккаунт.
          </p>
          <Link href="/login" className="ac-btn cinnabar w-full justify-center">
            Войти в аккаунт <span className="arr">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
