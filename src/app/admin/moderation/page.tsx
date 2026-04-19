"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, RotateCcw } from "lucide-react";

interface ChapterRow {
  id: string;
  title: string | null;
  is_public: boolean;
  is_deleted: boolean;
  created_at: string;
  user_id: string;
  anime: { title_ru: string | null } | null;
  profiles: { username: string | null } | null;
}

type Tab = 'public' | 'deleted';

export default function ModerationPage() {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [tab, setTab] = useState<Tab>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/admin/chapters?tab=${tab}`)
      .then(r => r.json())
      .then(setChapters)
      .finally(() => setIsLoading(false));
  }, [tab]);

  const action = async (id: string, act: string) => {
    setPending(id);
    await fetch(`/api/admin/chapters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    });
    setChapters(prev => prev.filter(c => c.id !== id));
    setPending(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">Модерация</h1>

      <div className="flex gap-2">
        {(['public', 'deleted'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              tab === t
                ? 'bg-[#E8409A] border-[#E8409A] text-white'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {t === 'public' ? 'Публичные главы' : 'Удалённые'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : chapters.length === 0 ? (
        <div className="py-20 text-center text-gray-500">Нет записей</div>
      ) : (
        <div className="space-y-3">
          {chapters.map(c => (
            <div key={c.id} className="bg-[#1A1A2E] border border-white/5 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#E8409A] mb-1">{c.anime?.title_ru ?? '—'}</div>
                <div className="text-white font-semibold truncate">{c.title ?? 'Без названия'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {c.profiles?.username ?? 'Аноним'} · {new Date(c.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {tab === 'public' ? (
                  <>
                    <button
                      onClick={() => action(c.id, 'unpublish')}
                      disabled={pending === c.id}
                      title="Снять с публикации"
                      className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => action(c.id, 'delete')}
                      disabled={pending === c.id}
                      title="Удалить"
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => action(c.id, 'restore')}
                    disabled={pending === c.id}
                    title="Восстановить"
                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
