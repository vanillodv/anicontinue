"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";

interface ErrorRow {
  id: string;
  error_type: string;
  error_message: string | null;
  created_at: string;
  anime_id: number | null;
  user: { username: string | null } | null;
}

const TYPE_COLORS: Record<string, string> = {
  ai_error:     'bg-red-500/10 text-red-400 border-red-500/20',
  stream_error: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  db_error:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  timeout:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  limit_reached:'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetch('/api/admin/errors')
      .then(r => r.json())
      .then(setErrors)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const clearOld = async () => {
    setClearing(true);
    await fetch('/api/admin/errors', { method: 'DELETE' });
    setClearing(false);
    load();
  };

  // Статистика по типам
  const counts = errors.reduce<Record<string, number>>((acc, e) => {
    acc[e.error_type] = (acc[e.error_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-orange-400" /> Лог ошибок
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ошибки генерации глав · последние 200</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={clearOld}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" /> Очистить старше 7 дней
          </button>
        </div>
      </div>

      {/* Сводка по типам */}
      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([type, count]) => (
            <div key={type} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${TYPE_COLORS[type] ?? 'bg-white/5 text-gray-400 border-white/10'}`}>
              {type}: {count}
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : errors.length === 0 ? (
        <div className="py-20 text-center bg-[#1A1A2E] rounded-2xl border border-white/5">
          <AlertTriangle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Ошибок нет 🎉</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                {['Время', 'Тип', 'Пользователь', 'Аниме', 'Сообщение'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {errors.map(e => (
                <tr key={e.id} className="bg-[#1A1A2E] hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${TYPE_COLORS[e.error_type] ?? 'bg-white/5 text-gray-400 border-white/10'}`}>
                      {e.error_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.user?.username ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.anime_id ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={e.error_message ?? ''}>
                    {e.error_message ?? <span className="text-gray-600">—</span>}
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
