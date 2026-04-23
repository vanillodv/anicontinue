"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { MessageCircle, Send, Trash2, Loader2, User } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
}

interface CommentsSectionProps {
  chapterId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} д назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function CommentsSection({ chapterId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chapter/${chapterId}/comments`);
        if (res.ok) setComments(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [chapterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/chapter/${chapterId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.status === 401) {
        setError("Войдите в аккаунт, чтобы оставить комментарий.");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error === "TOO_LONG" ? "Комментарий слишком длинный (макс. 1000 символов)." : "Не удалось отправить.");
        return;
      }
      const newComment: Comment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setText("");
      textareaRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/chapter/${chapterId}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const remaining = 1000 - text.length;

  return (
    <section id="comments" className="max-w-[720px] mx-auto mt-16 scroll-mt-24">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-2">
        <div>
          <div className="ac-eyebrow mb-3">
            <span className="dot" />
            <span>コメント · Comments</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 28, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            Обсуждение
            {!loading && comments.length > 0 && (
              <span
                className="ml-3"
                style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 400, color: "var(--ash)", letterSpacing: "0.05em" }}
              >
                {comments.length}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-12">
        <div
          className="overflow-hidden transition-colors"
          style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder={currentUserId ? "Напишите своё мнение о главе..." : "Войдите, чтобы оставить комментарий"}
            disabled={!currentUserId || submitting}
            rows={3}
            maxLength={1000}
            className="w-full px-5 pt-4 pb-2 resize-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "transparent",
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.55,
              minHeight: 80,
            }}
          />
          <div
            className="flex items-center justify-between px-5 pb-3 gap-3"
            style={{ borderTop: text.length > 0 ? "1px solid var(--line)" : "none", paddingTop: text.length > 0 ? 10 : 0 }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: remaining < 100 ? "var(--gold)" : "var(--ash)",
              }}
            >
              {text.length > 0 ? `${remaining} символов` : ""}
            </span>
            {currentUserId ? (
              <button type="submit" disabled={!text.trim() || submitting} className="ac-btn cinnabar disabled:opacity-40" style={{ padding: "8px 16px", fontSize: 11 }}>
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Отправить
              </button>
            ) : (
              <Link href="/login" className="ac-btn" style={{ padding: "8px 16px", fontSize: 11 }}>
                Войти <span className="arr">→</span>
              </Link>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-3" style={{ color: "var(--cinnabar)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em" }}>
            {error}
          </p>
        )}
      </form>

      {/* List */}
      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-9 h-9 shrink-0" style={{ background: "rgba(var(--rgb-ink),0.08)", borderRadius: 2 }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-28" style={{ background: "rgba(var(--rgb-ink),0.08)" }} />
                <div className="h-4 w-full" style={{ background: "rgba(var(--rgb-ink),0.05)" }} />
                <div className="h-4 w-2/3" style={{ background: "rgba(var(--rgb-ink),0.05)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div
          className="py-14 text-center"
          style={{ border: "1px dashed var(--line-strong)", background: "var(--paper-2)" }}
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 mb-3"
            style={{
              background: "rgba(var(--rgb-cinnabar),0.1)",
              border: "1px solid rgba(var(--rgb-cinnabar),0.35)",
              color: "var(--cinnabar)",
              fontFamily: "var(--font-jp)",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            言
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
            Пока нет комментариев · Будьте первым
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              {/* Avatar */}
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(var(--rgb-cinnabar),0.12)",
                  border: "1px solid rgba(var(--rgb-cinnabar),0.3)",
                  color: "var(--cinnabar)",
                  borderRadius: 2,
                }}
              >
                <User className="w-4 h-4" />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 14, color: "var(--ink)" }} className="truncate">
                    @{comment.username}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ash)" }}>
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p
                  className="whitespace-pre-wrap break-words"
                  style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)", opacity: 0.88 }}
                >
                  {comment.content}
                </p>
              </div>

              {currentUserId === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  title="Удалить"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 mt-0.5 p-2 transition-all"
                  style={{
                    border: "1px solid var(--line-strong)",
                    color: "var(--ash)",
                    borderRadius: 2,
                  }}
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unused icon hint */}
      <span aria-hidden className="hidden">
        <MessageCircle />
      </span>
    </section>
  );
}
