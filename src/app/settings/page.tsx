"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Save, Download, Trash2, LogOut } from "lucide-react";

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { flash('Не авторизован', false); setSaving(false); return; }

    const { error } = await supabase.from('profiles').update({ username: username.trim() }).eq('id', user.id);
    flash(error ? error.message : 'Имя обновлено!', !error);
    setSaving(false);
  };

  const exportData = async () => {
    const res = await fetch('/api/user/export-data');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anicontinue-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const deleteAccount = async () => {
    if (!confirm('Удалить аккаунт? Это действие необратимо.')) return;
    await fetch('/api/user/delete', { method: 'DELETE' });
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-[#0D0D1A] py-12">
      <div className="container mx-auto px-6 max-w-2xl space-y-8">
        <h1 className="text-3xl font-black text-white">Настройки</h1>

        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {/* Имя пользователя */}
        <section className="bg-[#1A1A2E] p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Имя пользователя</h2>
          <div className="flex gap-3">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Новое имя..."
              maxLength={32}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30"
            />
            <button
              onClick={saveUsername}
              disabled={saving || !username.trim()}
              className="px-5 py-2.5 bg-[#E8409A] hover:bg-[#d13589] rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Сохранить
            </button>
          </div>
        </section>

        {/* Данные (GDPR) */}
        <section className="bg-[#1A1A2E] p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Мои данные</h2>
          <p className="text-gray-400 text-sm">Скачайте все свои главы и данные профиля в формате JSON.</p>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-gray-300 transition-all"
          >
            <Download className="w-4 h-4" /> Экспортировать данные
          </button>
        </section>

        {/* Выход и удаление */}
        <section className="bg-[#1A1A2E] p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Аккаунт</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-gray-300 transition-all"
            >
              <LogOut className="w-4 h-4" /> Выйти
            </button>
            <button
              onClick={deleteAccount}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Удалить аккаунт
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
