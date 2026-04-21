"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Check } from "lucide-react";

const STORAGE_KEY = "anicontinue_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {}
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch {}
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(STORAGE_KEY, "declined"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div
          className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--line-strong)",
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.6)",
          }}
        >
          {/* Kanji seal */}
          <div
            className="shrink-0 w-11 h-11 flex items-center justify-center"
            style={{
              background: "rgba(232,93,79,0.12)",
              border: "1px solid rgba(232,93,79,0.4)",
              color: "var(--cinnabar)",
              fontFamily: "var(--font-jp)",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            粽
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ash)",
                marginBottom: 4,
              }}
            >
              Cookies · データ
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink)", opacity: 0.85 }}>
              Мы используем cookie-файлы для авторизации и улучшения работы сервиса.
              Нажимая «Принять», вы соглашаетесь с обработкой данных согласно{" "}
              <Link
                href="/legal/privacy"
                className="underline"
                style={{ color: "var(--cinnabar)" }}
              >
                Политике конфиденциальности
              </Link>
              .
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={decline} className="ac-btn" style={{ padding: "9px 16px" }}>
              <X className="w-3 h-3" />
              Отклонить
            </button>
            <button onClick={accept} className="ac-btn cinnabar" style={{ padding: "9px 16px" }}>
              <Check className="w-3 h-3" />
              Принять
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
