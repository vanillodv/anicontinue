"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

interface GrantRow {
  id: string;
  amount: number;
  note: string;
  created_at: string;
  user: { id: string; username: string | null } | null;
  admin: { id: string; username: string | null } | null;
}

export default function AdminGrantsPage() {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/grants')
      .then(r => r.json())
      .then(setGrants)
      .finally(() => setIsLoading(false));
  }, []);

  const total = grants.reduce((s, g) => s + g.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Gift className="w-7 h-7 text-[#E8409A]" /> История начислений
          </h1>
          <p className="text-gray-500 text-sm mt-1">Лог донатов и ручных начислений генераций</p>
        </div>
        {grants.length > 0 && (
          <div className="bg-[#1A1A2E] border border-white/5 rounded-xl px-5 py-3 text-center">
            <div className="text-2xl font-black text-[#E8409A]">{total}</div>
            <div className="text-xs text-gray-500">всего выдано</div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : grants.length === 0 ? (
        <div className="py-20 text-center bg-[#1A1A2E] rounded-2xl border border-white/5">
          <Gift className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Начислений пока нет</p>
          <p className="text-gray-600 text-sm mt-1">Начисления появятся когда добавишь генерации пользователям через раздел Юзеры</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                {['Пользователь', 'Количество', 'Причина', 'Кто выдал', 'Дата'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {grants.map(g => (
                <tr key={g.id} className="bg-[#1A1A2E] hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">
                    {g.user?.username ?? <span className="text-gray-500 italic">неизвестен</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#E8409A] font-black text-base">+{g.amount}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {g.note || <span className="text-gray-600 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {g.admin?.username ?? 'система'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(g.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
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
