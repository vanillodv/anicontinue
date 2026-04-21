"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Download, Trash2, LogOut } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const saveUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      flash(res.ok ? "Имя обновлено" : (data.message || data.error || "Ошибка"), res.ok);
    } catch {
      flash("Сеть недоступна", false);
    }
    setSaving(false);
  };

  const exportData = async () => {
    const res = await fetch("/api/user/export-data");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anicontinue-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const deleteAccount = async () => {
    if (!confirm("Удалить аккаунт? Это действие необратимо.")) return;
    await fetch("/api/user/delete", { method: "DELETE" });
    await supabase.auth.signOut();
    router.push("/");
  };

  const sectionStyle: React.CSSProperties = {
    background: "var(--paper-2)",
    border: "1px solid var(--line-strong)",
    padding: 28,
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "var(--ash)",
    marginBottom: 10,
  };
  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-serif)",
    fontWeight: 900,
    fontSize: 22,
    color: "var(--ink)",
    marginBottom: 6,
  };

  return (
    <div style={{ padding: "44px 44px 120px", maxWidth: 720, margin: "0 auto" }}>
      <div className="ac-eyebrow mb-6">
        <span className="dot" />
        <span>設定 · Settings</span>
        <span className="line" />
      </div>
      <h1
        className="mb-10"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontStyle: "italic",
          fontSize: "clamp(36px, 5vw, 64px)",
          lineHeight: 0.95,
          letterSpacing: "-0.025em",
          color: "var(--ink)",
        }}
      >
        <b style={{ fontStyle: "normal", fontWeight: 900 }}>Настройки</b>
      </h1>

      {msg && (
        <div
          className="px-4 py-3 mb-6 flex items-center"
          style={{
            border: `1px solid ${msg.ok ? "rgba(74,222,128,0.4)" : "var(--cinnabar)"}`,
            background: msg.ok ? "rgba(74,222,128,0.08)" : "rgba(232,93,79,0.08)",
            color: msg.ok ? "#86efac" : "var(--cinnabar)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
          }}
        >
          {msg.text}
        </div>
      )}

      <div className="space-y-5">
        {/* Username */}
        <section style={sectionStyle}>
          <div style={labelStyle}>Имя пользователя</div>
          <h2 style={h2Style}>Как вас видят другие</h2>
          <p className="mb-5" style={{ fontSize: 13, color: "var(--ash)", lineHeight: 1.55 }}>
            2–32 символа: латиница, кириллица, цифры, пробел, дефис, точка, подчёркивание.
            Зарезервированные имена вроде «admin» недоступны.
          </p>
          <div className="flex gap-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Новое имя…"
              maxLength={32}
              className="flex-1 px-4 py-3 focus:outline-none"
              style={{
                background: "transparent",
                border: "1px solid var(--line-strong)",
                borderRadius: 2,
                color: "var(--ink)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
            />
            <button onClick={saveUsername} disabled={saving || !username.trim()} className="ac-btn cinnabar disabled:opacity-50">
              {saving ? "…" : "Сохранить"}
            </button>
          </div>
        </section>

        {/* Data export */}
        <section style={sectionStyle}>
          <div style={labelStyle}>Мои данные</div>
          <h2 style={h2Style}>Экспорт профиля и глав</h2>
          <p className="mb-5" style={{ fontSize: 13, color: "var(--ash)", lineHeight: 1.55 }}>
            Скачайте все свои главы и данные профиля в формате JSON. Соответствует принципам GDPR.
          </p>
          <button onClick={exportData} className="ac-btn">
            <Download className="w-3.5 h-3.5" /> Экспортировать данные
          </button>
        </section>

        {/* Account */}
        <section style={sectionStyle}>
          <div style={labelStyle}>Аккаунт</div>
          <h2 style={h2Style}>Выход и удаление</h2>
          <p className="mb-5" style={{ fontSize: 13, color: "var(--ash)", lineHeight: 1.55 }}>
            После удаления аккаунта восстановить главы и профиль не получится.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={signOut} className="ac-btn">
              <LogOut className="w-3.5 h-3.5" /> Выйти
            </button>
            <button
              onClick={deleteAccount}
              className="flex items-center gap-2 px-5 py-3 transition-all"
              style={{
                background: "transparent",
                border: "1px solid var(--cinnabar)",
                borderRadius: 2,
                color: "var(--cinnabar)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cinnabar)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--cinnabar)"; }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Удалить аккаунт
            </button>
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 32px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
