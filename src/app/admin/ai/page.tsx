"use client";

import { useEffect, useState } from "react";
import { Save, CheckCircle } from "lucide-react";

interface Prompt { id: string; version: string; system_prompt: string; is_active: boolean; created_at: string; }

export default function AdminAIPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [newVersion, setNewVersion] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/prompts').then(r => r.json()).then(setPrompts);
  }, []);

  const activate = async (id: string) => {
    await fetch(`/api/admin/prompts/${id}/activate`, { method: 'POST' });
    setPrompts(prev => prev.map(p => ({ ...p, is_active: p.id === id })));
  };

  const save = async () => {
    if (!newVersion.trim() || !newPrompt.trim()) return;
    setSaving(true);
    const res = await fetch('/api/admin/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: newVersion, system_prompt: newPrompt }),
    });
    const data = await res.json();
    if (data.id) {
      setPrompts(prev => [data, ...prev]);
      setNewVersion('');
      setNewPrompt('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-white">AI Промпты</h1>

      {/* Создать новый */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Новая версия промпта</h2>
        <input
          value={newVersion}
          onChange={e => setNewVersion(e.target.value)}
          placeholder="Версия (например: v2.1)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30"
        />
        <textarea
          value={newPrompt}
          onChange={e => setNewPrompt(e.target.value)}
          placeholder="Системный промпт..."
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 resize-none font-mono"
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#E8409A] hover:bg-[#d13589] rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      {/* Список промптов */}
      <div className="space-y-3">
        {prompts.map(p => (
          <div key={p.id} className={`bg-[#1A1A2E] border rounded-xl p-4 space-y-2 ${p.is_active ? 'border-[#E8409A]/40' : 'border-white/5'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{p.version}</span>
                {p.is_active && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#E8409A]/10 text-[#E8409A] border border-[#E8409A]/20">
                    Активен
                  </span>
                )}
              </div>
              {!p.is_active && (
                <button
                  onClick={() => activate(p.id)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white/5 hover:bg-[#E8409A]/10 hover:text-[#E8409A] border border-white/10 text-gray-400 transition-all"
                >
                  Активировать
                </button>
              )}
            </div>
            <pre className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap line-clamp-3 font-mono">
              {p.system_prompt}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
