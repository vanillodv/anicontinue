"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, Check } from "lucide-react";

const STORAGE_KEY = "anicontinue_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage недоступен
    }
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
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <div className="bg-[#12122A] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[#E8409A]/10 border border-[#E8409A]/20 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-[#E8409A]" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 leading-relaxed">
              Мы используем cookie-файлы для авторизации и улучшения работы сервиса.
              Нажимая «Принять», вы соглашаетесь с обработкой данных согласно нашей{" "}
              <Link href="/legal/privacy" className="text-[#E8409A] hover:underline">
                Политике конфиденциальности
              </Link>
              .
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={decline}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Отклонить
            </button>
            <button
              onClick={accept}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white font-semibold bg-[#E8409A] hover:bg-[#d13589] transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Принять
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
