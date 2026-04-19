import { serviceClient } from '@/lib/admin/guard';
import { TrendingUp, Users, BookOpen, DollarSign } from 'lucide-react';

async function getData() {
  const supabase = serviceClient();

  const since14 = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
  const since1h  = new Date(Date.now() - 3_600_000).toISOString();

  const [{ data: logs }, { data: newUsers }, { data: costHour }, { data: topAnimeRaw }] = await Promise.all([
    supabase.from('ai_usage_logs').select('created_at, cost_usd').gte('created_at', since14),
    supabase.from('profiles').select('created_at').gte('created_at', since14),
    supabase.from('ai_usage_logs').select('cost_usd').gte('created_at', since1h),
    supabase.from('chapters')
      .select('anime_id, anime(title_ru, title_en)')
      .eq('is_deleted', false),
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

  // Последние 14 дней (с пустыми)
  const daily: { date: string; chapters: number; cost: number; new_users: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * 24 * 3600_000);
    const dateStr = d.toISOString().slice(0, 10);
    daily.push({ date: dateStr, ...(byDate.get(dateStr) ?? { chapters: 0, cost: 0, new_users: 0 }) });
  }

  // Топ аниме
  const animeCount = new Map<number, { title: string; count: number }>();
  for (const ch of topAnimeRaw ?? []) {
    const aid = ch.anime_id;
    const title = (ch.anime as any)?.title_ru || (ch.anime as any)?.title_en || `#${aid}`;
    const cur = animeCount.get(aid) ?? { title, count: 0 };
    cur.count++;
    animeCount.set(aid, cur);
  }
  const topAnime = Array.from(animeCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const costLastHour = (costHour ?? []).reduce((s: number, r: any) => s + (r.cost_usd ?? 0), 0);

  return { daily, costLastHour, alert: costLastHour > 5, topAnime };
}

export default async function AnalyticsPage() {
  const { daily, costLastHour, alert, topAnime } = await getData();
  const today = daily[0];

  const totalChapters14 = daily.reduce((s, d) => s + d.chapters, 0);
  const totalCost14     = daily.reduce((s, d) => s + d.cost, 0);
  const totalUsers14    = daily.reduce((s, d) => s + d.new_users, 0);

  // Для графика — переворачиваем (старые слева)
  const chartData = [...daily].reverse();
  const maxCost = Math.max(...chartData.map(d => d.cost), 0.0001);
  const maxChapters = Math.max(...chartData.map(d => d.chapters), 1);

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

      {/* Карточки */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Users,      label: 'Новых юзеров (14д)',  value: totalUsers14,                color: 'text-blue-400' },
          { icon: BookOpen,   label: 'Глав создано (14д)',   value: totalChapters14,              color: 'text-pink-400' },
          { icon: DollarSign, label: 'Расход (14д)',         value: `$${totalCost14.toFixed(4)}`, color: 'text-green-400' },
          { icon: TrendingUp, label: 'Глав сегодня',         value: today?.chapters ?? 0,         color: 'text-purple-400' },
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

      {/* График */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-white">Активность за 14 дней</h2>
        <div className="flex items-end gap-1.5 h-32">
          {chartData.map((d) => {
            const chapH = maxChapters > 0 ? Math.round((d.chapters / maxChapters) * 100) : 0;
            const costH  = maxCost    > 0 ? Math.round((d.cost    / maxCost)    * 100) : 0;
            const label = new Date(d.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-[#0D0D1A] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white whitespace-nowrap shadow-xl">
                    <div className="font-bold">{label}</div>
                    <div className="text-pink-400">{d.chapters} глав</div>
                    <div className="text-green-400">${d.cost.toFixed(4)}</div>
                  </div>
                  <div className="w-2 h-2 bg-[#0D0D1A] border-r border-b border-white/10 rotate-45 -mt-1" />
                </div>
                {/* Bars */}
                <div className="w-full flex items-end gap-0.5 h-24">
                  <div
                    className="flex-1 bg-[#E8409A]/60 rounded-t transition-all"
                    style={{ height: `${chapH}%`, minHeight: d.chapters > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="flex-1 bg-green-500/40 rounded-t transition-all"
                    style={{ height: `${costH}%`, minHeight: d.cost > 0 ? '2px' : '0' }}
                  />
                </div>
                <div className="text-[9px] text-gray-600 text-center leading-tight w-full">
                  {new Date(d.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#E8409A]/60 inline-block" /> Главы</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500/40 inline-block" /> Расход API</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Таблица за 14 дней */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="font-bold text-white">Последние 14 дней</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                {['Дата', 'Юзеры', 'Главы', 'Расход'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {daily.map((row) => (
                <tr key={row.date} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2.5 text-gray-300 text-xs">
                    {new Date(row.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-2.5 text-white">{row.new_users || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-2.5 text-white">{row.chapters || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-2.5 text-green-400 text-xs">
                    {row.cost > 0 ? `$${row.cost.toFixed(4)}` : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Топ аниме */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="font-bold text-white">Топ аниме по генерациям</h2>
          </div>
          {topAnime.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">Нет данных</div>
          ) : (
            <div className="divide-y divide-white/5">
              {topAnime.map((a, i) => {
                const pct = Math.round((a.count / topAnime[0].count) * 100);
                return (
                  <div key={a.title} className="px-6 py-3 flex items-center gap-3">
                    <span className={`text-sm font-black w-5 shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{a.title}</p>
                      <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E8409A]/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-[#E8409A] font-bold text-sm shrink-0">{a.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
