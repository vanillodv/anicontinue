import { serviceClient } from '@/lib/admin/guard';
import { TrendingUp, Users, BookOpen, DollarSign } from 'lucide-react';

async function getData() {
  const supabase = serviceClient();

  const since14 = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
  const since1h = new Date(Date.now() - 3_600_000).toISOString();

  const [{ data: logs }, { data: newUsers }, { data: costHour }] = await Promise.all([
    supabase.from('ai_usage_logs').select('created_at, cost_usd').gte('created_at', since14),
    supabase.from('profiles').select('created_at').gte('created_at', since14),
    supabase.from('ai_usage_logs').select('cost_usd').gte('created_at', since1h),
  ]);

  // Агрегируем по дате
  const byDate = new Map<string, { chapters: number; cost: number; new_users: number }>();

  for (const log of logs ?? []) {
    const date = log.created_at.slice(0, 10);
    const cur = byDate.get(date) ?? { chapters: 0, cost: 0, new_users: 0 };
    cur.chapters++;
    cur.cost += log.cost_usd ?? 0;
    byDate.set(date, cur);
  }

  for (const user of newUsers ?? []) {
    const date = user.created_at.slice(0, 10);
    const cur = byDate.get(date) ?? { chapters: 0, cost: 0, new_users: 0 };
    cur.new_users++;
    byDate.set(date, cur);
  }

  // Последние 14 дней (заполняем пустые дни)
  const daily: { date: string; chapters: number; cost: number; new_users: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * 24 * 3600_000);
    const dateStr = d.toISOString().slice(0, 10);
    daily.push({ date: dateStr, ...(byDate.get(dateStr) ?? { chapters: 0, cost: 0, new_users: 0 }) });
  }

  const costLastHour = (costHour ?? []).reduce((s: number, r: any) => s + (r.cost_usd ?? 0), 0);
  const alert = costLastHour > 5;

  return { daily, costLastHour, alert };
}

export default async function AnalyticsPage() {
  const { daily, costLastHour, alert } = await getData();
  const today = daily[0];

  const totalChapters14 = daily.reduce((s, d) => s + d.chapters, 0);
  const totalCost14 = daily.reduce((s, d) => s + d.cost, 0);
  const totalUsers14 = daily.reduce((s, d) => s + d.new_users, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white">Аналитика</h1>
        {alert && (
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-bold">
            ⚠️ Расход за час: ${costLastHour.toFixed(4)} — превышен порог $5!
          </div>
        )}
      </div>

      {/* Карточки за 14 дней */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Users,      label: 'Новых юзеров (14д)',  value: totalUsers14,               color: 'text-blue-400' },
          { icon: BookOpen,   label: 'Глав создано (14д)',   value: totalChapters14,             color: 'text-pink-400' },
          { icon: DollarSign, label: 'Расход (14д)',         value: `$${totalCost14.toFixed(4)}`, color: 'text-green-400' },
          { icon: TrendingUp, label: 'Глав сегодня',         value: today?.chapters ?? 0,        color: 'text-purple-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <Icon className={`w-6 h-6 ${color} shrink-0`} />
            <div>
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Таблица за 14 дней */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-bold text-white">Последние 14 дней</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              {['Дата', 'Новых юзеров', 'Глав', 'Расход'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {daily.map((row) => (
              <tr key={row.date} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-gray-300">
                  {new Date(row.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-4 py-3 text-white">{row.new_users || <span className="text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-white">{row.chapters || <span className="text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-green-400">
                  {row.cost > 0 ? `$${row.cost.toFixed(4)}` : <span className="text-gray-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
