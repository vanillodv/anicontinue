import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Технические работы",
  description: "Сайт временно недоступен — мы делаем его лучше. Заходите позже.",
};

export default function MaintenancePage() {
  return (
    <div
      className="flex flex-col items-center justify-center p-6 text-center"
      style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}
    >
      <div
        className="w-24 h-24 mb-8 flex items-center justify-center"
        style={{
          background: "rgba(232,93,79,0.1)",
          border: "1px solid rgba(232,93,79,0.4)",
          color: "var(--cinnabar)",
          fontFamily: "var(--font-jp)",
          fontWeight: 900,
          fontSize: 44,
          borderRadius: 2,
        }}
      >
        工
      </div>

      <div className="ac-eyebrow mb-5 justify-center">
        <span className="dot" />
        <span>整備中 · Maintenance</span>
      </div>

      <h1
        className="mb-5"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: "clamp(40px, 6vw, 72px)",
          lineHeight: 0.95,
          letterSpacing: "-0.025em",
        }}
      >
        Технические <b style={{ fontStyle: "normal", fontWeight: 900 }}>работы</b>
      </h1>
      <p className="max-w-md" style={{ color: "var(--ash)", fontSize: 17, lineHeight: 1.6 }}>
        Сайт временно недоступен — мы делаем его лучше. Заходите позже.
      </p>
      <p
        className="mt-8"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ash)",
        }}
      >
        AniContinue · 続き物語
      </p>
    </div>
  );
}
