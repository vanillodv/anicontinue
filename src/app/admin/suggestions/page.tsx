"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2, CheckCircle2, Clock, Rocket, XCircle, Lightbulb } from "lucide-react";

type Status = 'new' | 'reviewing' | 'planned' | 'done' | 'declined';

interface Suggestion {
  id: string;
  username: string;
  text: string;
  votes: number;
  status: Status;
  created_at: string;
}

const statusOptions: { value: Status; label: string; color: string }[] = [
  { value: 'new',       label: 'Новое',           color: 'bg-gray-500/20 text-gray-300' },
  { value: 'reviewing', label: 'Рассматривается', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'planned',   label: 'В планах',         color: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'done',      label: 'Реализовано',      color: 'bg-green-500/20 text-green-300' },
  { value: 'declined',  label: 'Не в планах',      color: 'bg-red-500/20 text-red-300' },
];

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => { setSuggestions(d.suggestions || []); setLoading(false); });
  }, []);

  const updateStatus = async (id: string, status: Status) => {
    setUpdating(id);
    const res = await fetch(`/api/admin/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    }
    setUpdating(null);
  };

  const counts = suggestions.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Lightbulb className="w-6 h-6 text-[#E8409A]" /> Пожелания сообщества
      </h1>
      <p className="text-gray-500 text-sm mb-6">Всего: {suggestions.length} · Новых: {counts['new'] || 0}</p>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {statusOptions.map(s => (
          <div key={s.value} className={`rounded-2xl p-4 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{counts[s.value] || 0}</div>
            <div className="text-xs mt-1 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#E8409A] animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 flex items-start gap-4">
              {/* Votes */}
              <div className="flex flex-col items-center gap-1 min-w-[44px]">
                <Heart className="w-4 h-4 text-[#E8409A] fill-[#E8409A]" />
                <span className="text-sm font-bold text-white">{s.votes}</span>
              </div>

              {/* Content */}
              <div className="flex-grow">
                <p className="text-gray-200 text-sm leading-relaxed mb-2">{s.text}</p>
                <p className="text-xs text-gray-600">{s.username} · {new Date(s.created_at).toLocaleDateString('ru-RU')}</p>
              </div>

              {/* Status selector */}
              <div className="shrink-0">
                {updating === s.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <select
                    value={s.status}
                    onChange={e => updateStatus(s.id, e.target.value as Status)}
                    className="bg-[#0D0D1A] border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#E8409A]/40 cursor-pointer"
                  >
                    {statusOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
