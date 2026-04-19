"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldOff, ShieldCheck } from "lucide-react";

interface UserRow {
  id: string;
  username: string | null;
  plan: string;
  role: string;
  chapters_used: number;
  chapters_limit: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setIsLoading(false));
  }, []);

  const patch = async (id: string, body: object) => {
    setPending(id);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...body } : u));
    setPending(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">Пользователи</h1>

      {isLoading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs">
              <tr>
                {['Пользователь', 'План', 'Роль', 'Главы', 'Дата', 'Действия'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="bg-[#1A1A2E] hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">
                    {u.username ?? <span className="text-gray-500 italic">без имени</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#E8409A]/10 text-[#E8409A] border border-[#E8409A]/20">
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{u.role}</td>
                  <td className="px-4 py-3 text-gray-300">{u.chapters_used} / {u.chapters_limit}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => patch(u.id, { chapters_used: 0, chapters_limit: 9999 })}
                        disabled={pending === u.id}
                        title="Сбросить лимит"
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {u.role === 'user' ? (
                        <button
                          onClick={() => patch(u.id, { role: 'moderator' })}
                          disabled={pending === u.id}
                          title="Дать роль модератора"
                          className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => patch(u.id, { role: 'user' })}
                          disabled={pending === u.id}
                          title="Понизить до user"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
