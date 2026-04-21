"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, X, Check, Loader2, Star } from "lucide-react";
import Image from "next/image";
import { proxyImage } from "@/lib/proxyImage";

interface AnimeRow {
  id: number;
  title_ru: string | null;
  title_en: string | null;
  poster_url: string | null;
  score: number | null;
  year: number | null;
  status: string | null;
  episodes: number | null;
  studio: string | null;
}

interface AnimeDetail extends AnimeRow {
  title_jp: string | null;
  synopsis: string | null;
  genres: any;
  prompt_template: string | null;
  ending_context: string | null;
}

const EMPTY: Partial<AnimeDetail> = {
  title_ru: '', title_en: '', title_jp: '', synopsis: '',
  poster_url: '', score: null, year: null, studio: '',
  episodes: null, status: 'finished', prompt_template: '', ending_context: '',
};

export default function AdminAnimePage() {
  const [items, setItems] = useState<AnimeRow[]>([]);
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modal
  const [modal, setModal] = useState<'edit' | 'add' | null>(null);
  const [editing, setEditing] = useState<Partial<AnimeDetail>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(query); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/admin/anime?q=${encodeURIComponent(debouncedQ)}&page=${page}`)
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setCount(d.count ?? 0); })
      .finally(() => setIsLoading(false));
  }, [debouncedQ, page]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (id: number) => {
    setSaving(false);
    const res = await fetch(`/api/admin/anime/${id}`);
    const data = await res.json();
    setEditing(data);
    setModal('edit');
  };

  const openAdd = () => { setEditing(EMPTY); setModal('add'); };

  const save = async () => {
    setSaving(true);
    const isEdit = modal === 'edit';
    const url = isEdit ? `/api/admin/anime/${(editing as AnimeDetail).id}` : '/api/admin/anime';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (res.ok) { setModal(null); load(); }
  };

  const remove = async (id: number) => {
    await fetch(`/api/admin/anime/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  const field = (key: keyof AnimeDetail, label: string, type: 'text' | 'number' | 'textarea' = 'text') => (
    <div key={key} className="space-y-1">
      <label className="text-xs text-gray-500 uppercase font-bold">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={(editing as any)[key] ?? ''}
          onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#E8409A]/50"
        />
      ) : (
        <input
          type={type}
          value={(editing as any)[key] ?? ''}
          onChange={e => setEditing(prev => ({ ...prev, [key]: type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8409A]/50"
        />
      )}
    </div>
  );

  const totalPages = Math.ceil(count / 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Каталог аниме</h1>
          <p className="text-gray-500 text-sm mt-1">{count} аниме в базе</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#E8409A] hover:bg-[#d13589] text-white rounded-xl font-bold text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по названию..."
          className="w-full bg-[#1A1A2E] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8409A]/50"
        />
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              {['Постер', 'Название', 'Год', 'Рейтинг', 'Серий', 'Статус', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Загрузка...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Ничего не найдено</td></tr>
            ) : items.map(a => (
              <tr key={a.id} className="bg-[#1A1A2E] hover:bg-white/5 transition-colors">
                <td className="px-4 py-2">
                  <div className="w-8 h-11 rounded overflow-hidden bg-white/5 relative shrink-0">
                    {a.poster_url
                      ? <Image src={proxyImage(a.poster_url)!} alt="" fill className="object-cover" unoptimized />
                      : <div className="w-full h-full" />}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <p className="text-white font-medium">{a.title_ru || a.title_en}</p>
                  {a.title_ru && a.title_en && <p className="text-gray-500 text-xs">{a.title_en}</p>}
                </td>
                <td className="px-4 py-2 text-gray-400">{a.year ?? '—'}</td>
                <td className="px-4 py-2">
                  {a.score ? (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3 h-3 fill-yellow-400" />{a.score}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 text-gray-400">{a.episodes ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === 'ongoing' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-400'
                  }`}>{a.status ?? '—'}</span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(a.id)}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                    ><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => setDeleteId(a.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 text-sm">←</button>
          <span className="text-gray-500 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 text-sm">→</button>
        </div>
      )}

      {/* Модалка редактирования */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#1A1A2E]">
              <h2 className="font-bold text-white">{modal === 'add' ? 'Новое аниме' : 'Редактировать'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {field('title_ru', 'Название (рус)')}
              {field('title_en', 'Название (англ)')}
              {field('title_jp', 'Название (яп)')}
              {field('poster_url', 'URL постера')}
              <div className="grid grid-cols-3 gap-3">
                {field('year', 'Год', 'number')}
                {field('score', 'Рейтинг', 'number')}
                {field('episodes', 'Серий', 'number')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('studio', 'Студия')}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase font-bold">Статус</label>
                  <select
                    value={(editing as any).status ?? 'finished'}
                    onChange={e => setEditing(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    <option value="finished">finished</option>
                    <option value="ongoing">ongoing</option>
                    <option value="upcoming">upcoming</option>
                  </select>
                </div>
              </div>
              {field('synopsis', 'Синопсис', 'textarea')}
              {field('ending_context', 'Контекст окончания (для AI)', 'textarea')}
              {field('prompt_template', 'Шаблон промпта (для AI)', 'textarea')}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 text-sm transition-all">
                Отмена
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#E8409A] hover:bg-[#d13589] text-white font-bold text-sm transition-all disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-white font-bold">Удалить аниме?</h2>
            <p className="text-gray-400 text-sm">Это действие нельзя отменить. Все связанные главы останутся в базе.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10">Отмена</button>
              <button onClick={() => remove(deleteId)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
