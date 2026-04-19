import { createClient } from '@/lib/supabase/server';
import { TrendingUp, Users, BookOpen, DollarSign } from 'lucide-react';

async function getData() {
  const supabase = await createClient();

  const [{ data: daily }, { data: costHour }] = await Promise.all([
    supabase.from('analytics_daily').select('*').order('date', { ascending: false }).limit(14),
    supabase.from('ai_usage_logs').select('cost_usd, created_at')
      .gte('created_at', new Date(Date.now() - 3_600_000).toISOString()),
  ]);

  const costLastHour = (costHour ?? []).reduce((s: number, r: any) => s + (r.cost_usd ?? 0), 0);
  const alert = costLastHour > 5;

  return { daily: daily ?? [], costLastHour, alert };
}

export default async function AnalyticsPage() {
  const { daily, costLastHour, alert } = await getData();
  const latest = daily[0];

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

      {/* Карточки за сегодня */}
      {latest && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: Users,     label: 'Новых юзеров',  value: latest.new_users,   color: 'text-blue-400' },
            { icon: BookOpen,  label: 'Новых глав',    value: latest.new_chapters, color: 'text-pink-400' },
            { icon: DollarSign,label: 'Расход ($)',    value: `$${Number(latest.cost_usd).toFixed(4)}`, color: 'text-green-400' },
            { icon: TrendingUp,label: 'Активных юзеров', value: latest.active_users, color: 'text-purple-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <Icon className={`w-6 h-6 ${color}`} />
              <div>
                <div className="text-xl font-black text-white">{value}</div>
                <div className="text-xs text-gray-500">{label} сегодня</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Таблица за 14 дней */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-bold text-white">Последние 14 дней</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              {['Дата', 'Юзеры', 'Главы', 'Активных', 'Расход'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {daily.map((row: any) => (
              <tr key={row.date} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-gray-300">{row.date}</td>
                <td className="px-4 py-3 text-white">{row.new_users}</td>
                <td className="px-4 py-3 text-white">{row.new_chapters}</td>
                <td className="px-4 py-3 text-white">{row.active_users}</td>
                <td className="px-4 py-3 text-green-400">${Number(row.cost_usd).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
