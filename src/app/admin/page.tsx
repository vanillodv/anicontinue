import { createClient } from '@/lib/supabase/server';
import { Users, BookOpen, DollarSign, AlertTriangle } from 'lucide-react';

async function getMetrics() {
  const supabase = await createClient();

  const [
    { count: totalUsers },
    { count: totalChapters },
    { data: usageCost },
    { count: flaggedChapters },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('ai_usage_logs').select('cost_usd'),
    supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('is_deleted', true),
  ]);

  const totalCost = (usageCost ?? []).reduce((sum: number, r: any) => sum + (r.cost_usd ?? 0), 0);

  return { totalUsers, totalChapters, totalCost, flaggedChapters };
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const { totalUsers, totalChapters, totalCost, flaggedChapters } = await getMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Дашборд</h1>
        <p className="text-gray-500 mt-1">Общая статистика системы</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard icon={Users}         label="Пользователей"  value={String(totalUsers ?? 0)}    color="bg-blue-500/20" />
        <StatCard icon={BookOpen}      label="Глав создано"   value={String(totalChapters ?? 0)} color="bg-[#E8409A]/20" />
        <StatCard icon={DollarSign}    label="Расход API ($)" value={`$${totalCost.toFixed(4)}`} color="bg-green-500/20" />
        <StatCard icon={AlertTriangle} label="Удалённых глав" value={String(flaggedChapters ?? 0)} color="bg-orange-500/20" />
      </div>

      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Последние действия</h2>
        <p className="text-gray-500 text-sm">Лог действий появится здесь после настройки аналитики.</p>
      </div>
    </div>
  );
}
