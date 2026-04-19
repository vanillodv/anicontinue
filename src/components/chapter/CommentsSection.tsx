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
  if (min < 60) return `${min} мин. назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч. назад`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} д. назад`;
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

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [supabase]);

  // Load comments
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

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const remaining = 1000 - text.length;

  return (
    <section id="comments" className="max-w-[680px] mx-auto mt-16 scroll-mt-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="w-5 h-5 text-[#E8409A]" />
        <h2 className="text-xl font-bold text-white">
          Комментарии
          {!loading && comments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({comments.length})</span>
          )}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-10">
        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl overflow-hidden focus-within:border-[#E8409A]/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder={
              currentUserId
                ? "Напишите своё мнение о главе..."
                : "Войдите, чтобы оставить комментарий"
            }
            disabled={!currentUserId || submitting}
            rows={3}
            maxLength={1000}
            className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-gray-200 placeholder-gray-600 resize-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "80px" }}
          />
          <div className="flex items-center justify-between px-5 pb-3">
            <span className={`text-xs ${remaining < 100 ? "text-yellow-500" : "text-gray-600"}`}>
              {text.length > 0 ? `${remaining} символов` : ""}
            </span>
            {currentUserId ? (
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="flex items-center gap-2 bg-[#E8409A] hover:bg-[#d13589] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Отправить
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400 px-1">{error}</p>
        )}
      </form>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-28 bg-white/10 rounded-full" />
                <div className="h-4 w-full bg-white/5 rounded-md" />
                <div className="h-4 w-2/3 bg-white/5 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
          <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Пока нет комментариев. Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/20 flex items-center justify-center shrink-0 text-[#E8409A]">
                <User className="w-4 h-4" />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-white truncate">
                    {comment.username}
                  </span>
                  <span className="text-xs text-gray-600">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>

              {/* Delete (own comments) */}
              {currentUserId === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  title="Удалить"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 mt-0.5 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
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
    </section>
  );
}
