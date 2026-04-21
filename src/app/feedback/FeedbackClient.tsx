"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Send, Loader2, CheckCircle2, Clock, Rocket, XCircle } from "lucide-react";
import Link from "next/link";

type Status = "new" | "reviewing" | "planned" | "done" | "declined";

interface Suggestion {
  id: string;
  user_id: string;
  username: string;
  text: string;
  votes: number;
  status: Status;
  created_at: string;
}

const statusConfig: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  new:       { label: "Новое",          color: "var(--ash)",     icon: <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--ash)]" /> },
  reviewing: { label: "Рассматривается", color: "#60A5FA",        icon: <Clock className="w-3 h-3" /> },
  planned:   { label: "В планах",        color: "var(--gold)",    icon: <Rocket className="w-3 h-3" /> },
  done:      { label: "Реализовано",     color: "#86EFAC",        icon: <CheckCircle2 className="w-3 h-3" /> },
  declined:  { label: "Не в планах",     color: "var(--cinnabar)", icon: <XCircle className="w-3 h-3" /> },
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export default function FeedbackPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchSuggestions(); }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    const res = await fetch("/api/suggestions");
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setVotedIds(new Set(data.votedIds || []));
    setUserId(data.userId);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    if (text.trim().length < 10) { setSubmitError("Минимум 10 символов"); return; }
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setSubmitError(data.error || "Ошибка"); return; }
    setSuggestions((prev) => [data.suggestion, ...prev]);
    setText("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleVote = async (id: string) => {
    if (!userId || votingId) return;
    setVotingId(id);
    const res = await fetch(`/api/suggestions/${id}/vote`, { method: "POST" });
    const data = await res.json();
    setVotingId(null);
    if (!res.ok) return;
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (data.voted) next.add(id); else next.delete(id);
      return next;
    });
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, votes: data.votes } : s)));
  };

  const filtered = filter === "all" ? suggestions : suggestions.filter((s) => s.status === filter);

  const counts = suggestions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: "44px 44px 120px", maxWidth: 880, margin: "0 auto" }}>

      {/* Header */}
      <div className="text-center mb-14">
        <div className="ac-eyebrow mb-5 justify-center">
          <span className="dot" />
          <span>意見 · Feedback</span>
        </div>
        <h1
          className="mb-4"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          Пожелания <b style={{ fontStyle: "normal", fontWeight: 900 }}>сообщества</b>
        </h1>
        <p className="max-w-xl mx-auto" style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ash)" }}>
          Чего не хватает? Что сделать лучше? Предлагай — голосуем вместе,
          самые популярные идеи берём в работу.
        </p>
      </div>

      {/* Form */}
      <section className="mb-10" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", padding: 28 }}>
        {userId ? (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)", marginBottom: 10 }}>
              Новое предложение
            </div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 22, color: "var(--ink)", marginBottom: 14 }}>
              Расскажи свою идею
            </h2>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setSubmitError(""); }}
              placeholder="Например: хочу видеть уведомления когда кто-то лайкнул мою главу..."
              className="w-full p-4 resize-none outline-none transition-colors"
              style={{
                background: "transparent",
                border: "1px solid var(--line-strong)",
                borderRadius: 2,
                color: "var(--ink)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                lineHeight: 1.5,
                minHeight: 110,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cinnabar)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
              <div className="flex items-center gap-3" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}>
                <span>{text.length}/500</span>
                {submitError && <span style={{ color: "var(--cinnabar)" }}>{submitError}</span>}
                {submitted && (
                  <span className="flex items-center gap-1" style={{ color: "#86EFAC" }}>
                    <CheckCircle2 className="w-3 h-3" /> Отправлено
                  </span>
                )}
              </div>
              <button onClick={handleSubmit} disabled={submitting || text.trim().length < 10} className="ac-btn cinnabar disabled:opacity-40">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Отправить
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="mb-5" style={{ color: "var(--ash)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Чтобы предложить идею — войди в аккаунт
            </p>
            <Link href="/login" className="ac-btn cinnabar">
              Войти <span className="arr">→</span>
            </Link>
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6" style={{ fontFamily: "var(--font-mono)" }}>
        <button
          onClick={() => setFilter("all")}
          className="flex items-center gap-1.5 px-3.5 py-2"
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            background: filter === "all" ? "var(--ink)" : "transparent",
            color: filter === "all" ? "var(--paper)" : "var(--ink)",
            border: `1px solid ${filter === "all" ? "var(--ink)" : "var(--line-strong)"}`,
            borderRadius: 2,
          }}
        >
          Все ({suggestions.length})
        </button>
        {(Object.entries(statusConfig) as [Status, typeof statusConfig[Status]][]).map(([key, cfg]) =>
          counts[key] ? (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 px-3.5 py-2"
              style={{
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: filter === key ? cfg.color : "transparent",
                color: filter === key ? (cfg.color === "var(--gold)" || cfg.color === "#86EFAC" ? "var(--paper)" : "#fff") : cfg.color,
                border: `1px solid ${cfg.color}`,
                borderRadius: 2,
              }}
            >
              {cfg.icon} {cfg.label} ({counts[key]})
            </button>
          ) : null
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cinnabar)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}>
          {filter === "all" ? "Пока нет пожеланий. Будь первым!" : "В этой категории пусто"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const voted = votedIds.has(s.id);
            const cfg = statusConfig[s.status];
            return (
              <div
                key={s.id}
                className="flex gap-4 p-5 transition-all"
                style={{ background: "var(--paper-2)", border: `1px solid ${s.status === "done" ? "rgba(134,239,172,0.25)" : "var(--line)"}` }}
              >
                {/* Vote */}
                <button
                  onClick={() => handleVote(s.id)}
                  disabled={!userId || votingId === s.id}
                  className="flex flex-col items-center gap-1 min-w-[44px] py-1 transition-all"
                  style={{
                    color: voted ? "var(--cinnabar)" : userId ? "var(--ash)" : "var(--line-strong)",
                    cursor: userId ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => userId && !voted && (e.currentTarget.style.color = "var(--cinnabar)")}
                  onMouseLeave={(e) => userId && !voted && (e.currentTarget.style.color = "var(--ash)")}
                >
                  {votingId === s.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Heart className="w-4 h-4" style={{ fill: voted ? "currentColor" : "none" }} />
                  }
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{s.votes}</span>
                </button>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{s.text}</p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}>
                    <span>@{s.username} · {timeAgo(s.created_at)}</span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5"
                      style={{ color: cfg.color, border: `1px solid ${cfg.color}`, borderRadius: 2 }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 32px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
