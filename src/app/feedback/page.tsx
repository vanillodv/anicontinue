"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Lightbulb, Send, Loader2, CheckCircle2, Clock, Rocket, XCircle, Sparkles } from "lucide-react";
import Link from "next/link";

type Status = 'new' | 'reviewing' | 'planned' | 'done' | 'declined';

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
  new:       { label: 'Новое',        color: 'bg-gray-500/20 text-gray-400 border-gray-500/20',     icon: <Lightbulb className="w-3 h-3" /> },
  reviewing: { label: 'Рассматривается', color: 'bg-blue-500/20 text-blue-400 border-blue-500/20', icon: <Clock className="w-3 h-3" /> },
  planned:   { label: 'В планах',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20', icon: <Rocket className="w-3 h-3" /> },
  done:      { label: 'Реализовано',  color: 'bg-green-500/20 text-green-400 border-green-500/20',  icon: <CheckCircle2 className="w-3 h-3" /> },
  declined:  { label: 'Не в планах', color: 'bg-red-500/20 text-red-400 border-red-500/20',         icon: <XCircle className="w-3 h-3" /> },
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export default function FeedbackPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    const res = await fetch('/api/suggestions');
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setVotedIds(new Set(data.votedIds || []));
    setUserId(data.userId);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    if (text.trim().length < 10) { setSubmitError('Минимум 10 символов'); return; }
    setSubmitting(true);
    setSubmitError('');
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setSubmitError(data.error || 'Ошибка'); return; }
    setSuggestions(prev => [data.suggestion, ...prev]);
    setText('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleVote = async (id: string) => {
    if (!userId || votingId) return;
    setVotingId(id);
    const res = await fetch(`/api/suggestions/${id}/vote`, { method: 'POST' });
    const data = await res.json();
    setVotingId(null);
    if (!res.ok) return;
    setVotedIds(prev => {
      const next = new Set(prev);
      data.voted ? next.add(id) : next.delete(id);
      return next;
    });
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, votes: data.votes } : s));
  };

  const filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.status === filter);

  const counts = suggestions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="min-h-screen bg-[#0D0D1A] text-white py-16">
      <div className="container mx-auto px-6 max-w-3xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 mb-6">
            <Lightbulb className="w-8 h-8 text-[#E8409A]" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Пожелания сообщества</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Чего не хватает? Что сделать лучше? Предлагай — голосуем вместе,
            самые популярные идеи берём в работу.
          </p>
        </div>

        {/* Форма */}
        <div className="bg-[#1A1A2E] border border-white/10 rounded-3xl p-6 mb-8">
          {userId ? (
            <>
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8409A]" />
                Предложить идею
              </h2>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => { setText(e.target.value); setSubmitError(''); }}
                placeholder="Например: хочу видеть уведомления когда кто-то лайкнул мою главу..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none outline-none focus:border-[#E8409A]/40 transition-colors min-h-[100px]"
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">{text.length}/500</span>
                  {submitError && <span className="text-xs text-red-400">{submitError}</span>}
                  {submitted && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Отправлено!</span>}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || text.trim().length < 10}
                  className="flex items-center gap-2 bg-[#E8409A] hover:bg-[#d13589] disabled:opacity-40 text-white font-bold py-2 px-5 rounded-full text-sm transition-all"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Отправить
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-4">Чтобы предложить идею — войди в аккаунт</p>
              <Link href="/login" className="bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-2 px-6 rounded-full text-sm transition-all">
                Войти
              </Link>
            </div>
          )}
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${filter === 'all' ? 'bg-[#E8409A] text-white border-[#E8409A]' : 'border-white/10 text-gray-400 hover:border-white/20'}`}
          >
            Все ({suggestions.length})
          </button>
          {(Object.entries(statusConfig) as [Status, typeof statusConfig[Status]][]).map(([key, cfg]) =>
            counts[key] ? (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${filter === key ? cfg.color + ' border-current' : 'border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                {cfg.icon}{cfg.label} ({counts[key]})
              </button>
            ) : null
          )}
        </div>

        {/* Список */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#E8409A] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            {filter === 'all' ? 'Пока нет пожеланий. Будь первым!' : 'В этой категории пусто'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const voted = votedIds.has(s.id);
              const cfg = statusConfig[s.status];
              return (
                <div
                  key={s.id}
                  className={`flex gap-4 bg-[#1A1A2E] border rounded-2xl p-5 transition-all ${s.status === 'done' ? 'border-green-500/20' : 'border-white/5'}`}
                >
                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(s.id)}
                    disabled={!userId || votingId === s.id}
                    className={`flex flex-col items-center gap-1 min-w-[44px] py-1 rounded-xl transition-all ${
                      voted
                        ? 'text-[#E8409A]'
                        : userId
                        ? 'text-gray-600 hover:text-[#E8409A]'
                        : 'text-gray-700 cursor-default'
                    }`}
                  >
                    {votingId === s.id
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Heart className={`w-5 h-5 transition-all ${voted ? 'fill-[#E8409A]' : ''}`} />
                    }
                    <span className="text-xs font-bold">{s.votes}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <p className="text-gray-200 text-sm leading-relaxed">{s.text}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-600">{s.username} · {timeAgo(s.created_at)}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
