"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, RotateCcw, X, Loader2 } from "lucide-react";

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

interface ChapterPreview {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  is_public: boolean;
  anime: { title_ru: string | null } | null;
  profiles: { username: string | null } | null;
}

type Tab = 'public' | 'deleted';

export default function ModerationPage() {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [tab, setTab] = useState<Tab>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  // Preview
  const [preview, setPreview] = useState<ChapterPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
    if (preview?.id === id) setPreview(null);
    setPending(null);
  };

  const openPreview = async (id: string) => {
    setPreviewLoading(true);
    setPreview(null);
    const res = await fetch(`/api/admin/chapters/${id}`);
    const data = await res.json();
    setPreview(data);
    setPreviewLoading(false);
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
        <div className="space-y-2">
          {chapters.map(c => (
            <div key={c.id} className={`bg-[#1A1A2E] border rounded-xl p-4 flex items-center gap-4 transition-all ${
              preview?.id === c.id ? 'border-[#E8409A]/40' : 'border-white/5'
            }`}>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#E8409A] mb-1">{c.anime?.title_ru ?? '—'}</div>
                <div className="text-white font-semibold truncate">{c.title ?? 'Без названия'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {c.profiles?.username ?? 'Аноним'} · {new Date(c.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Превью */}
                <button
                  onClick={() => preview?.id === c.id ? setPreview(null) : openPreview(c.id)}
                  title="Читать главу"
                  className={`p-2 rounded-lg transition-all ${
                    preview?.id === c.id
                      ? 'bg-[#E8409A]/20 text-[#E8409A]'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </button>

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

      {/* Панель превью */}
      {(previewLoading || preview) && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[#0D0D1A] border-l border-white/10 z-50 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <div className="min-w-0">
              <p className="text-xs text-[#E8409A]">{preview?.anime?.title_ru ?? '—'}</p>
              <h2 className="text-white font-bold truncate">{preview?.title ?? '...'}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {preview?.profiles?.username ?? ''} · {preview ? new Date(preview.created_at).toLocaleDateString('ru-RU') : ''}
              </p>
            </div>
            <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white ml-4 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              </div>
            ) : (
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {preview?.content}
              </div>
            )}
          </div>
          {preview && (
            <div className="px-6 py-4 border-t border-white/5 flex gap-2 shrink-0">
              {tab === 'public' ? (
                <>
                  <button
                    onClick={() => action(preview.id, 'unpublish')}
                    className="flex-1 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-sm font-medium transition-all"
                  >
                    Снять с публикации
                  </button>
                  <button
                    onClick={() => action(preview.id, 'delete')}
                    className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all"
                  >
                    Удалить
                  </button>
                </>
              ) : (
                <button
                  onClick={() => action(preview.id, 'restore')}
                  className="flex-1 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-all"
                >
                  Восстановить
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
