"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldOff, ShieldCheck, Plus } from "lucide-react";

interface UserRow {
  id: string;
  username: string | null;
  email: string | null;
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
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("10");

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

  const addGenerations = async (user: UserRow) => {
    const n = parseInt(addAmount, 10);
    if (!n || n <= 0) return;
    const newLimit = user.chapters_limit + n;
    await patch(user.id, { chapters_limit: newLimit });
    setAddingFor(null);
    setAddAmount("10");
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
                {['Пользователь', 'Email', 'План', 'Роль', 'Главы', 'Дата', 'Действия'].map(h => (
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
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">
                    {u.email ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#E8409A]/10 text-[#E8409A] border border-[#E8409A]/20">
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{u.role}</td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className={u.chapters_used >= u.chapters_limit ? 'text-red-400' : ''}>
                      {u.chapters_used}
                    </span>
                    {' / '}
                    {u.chapters_limit}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Добавить генерации */}
                      {addingFor === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={addAmount}
                            onChange={e => setAddAmount(e.target.value)}
                            className="w-14 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs text-center"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') addGenerations(u); if (e.key === 'Escape') setAddingFor(null); }}
                          />
                          <button
                            onClick={() => addGenerations(u)}
                            disabled={pending === u.id}
                            className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-all"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setAddingFor(null)}
                            className="px-2 py-1 rounded bg-white/5 text-gray-500 text-xs hover:bg-white/10 transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingFor(u.id); setAddAmount("10"); }}
                          disabled={pending === u.id}
                          title="Добавить генерации"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50 text-xs font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ген.
                        </button>
                      )}

                      {/* Сброс использованных */}
                      <button
                        onClick={() => patch(u.id, { chapters_used: 0 })}
                        disabled={pending === u.id}
                        title="Сбросить счётчик использования"
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {/* Роль */}
                      {u.role === 'user' ? (
                        <button
                          onClick={() => patch(u.id, { role: 'moderator' })}
                          disabled={pending === u.id}
                          title="Дать роль модератора"
                          className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      ) : u.role !== 'super_admin' ? (
                        <button
                          onClick={() => patch(u.id, { role: 'user' })}
                          disabled={pending === u.id}
                          title="Понизить до user"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          <ShieldOff className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600 px-2">—</span>
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
