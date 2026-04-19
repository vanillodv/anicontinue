import { serviceClient } from '@/lib/admin/guard';
import { Users, BookOpen, DollarSign, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

async function getMetrics() {
  const supabase = serviceClient();

  const [
    { count: totalUsers },
    { count: totalChapters },
    { data: usageCost },
    { count: flaggedChapters },
    { data: recentChapters },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('ai_usage_logs').select('cost_usd'),
    supabase.from('chapters').select('*', { count: 'exact', head: true }).eq('is_deleted', true),
    supabase.from('chapters')
      .select('id, title, created_at, anime_id, anime(title_ru)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const totalCost = (usageCost ?? []).reduce((sum: number, r: any) => sum + (r.cost_usd ?? 0), 0);

  return { totalUsers, totalChapters, totalCost, flaggedChapters, recentChapters: recentChapters ?? [] };
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
  const { totalUsers, totalChapters, totalCost, flaggedChapters, recentChapters } = await getMetrics();

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

      {/* Последние действия */}
      <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Последние главы</h2>
          <Link href="/admin/moderation" className="text-xs text-gray-500 hover:text-[#E8409A] transition-colors">
            Все →
          </Link>
        </div>
        {recentChapters.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Глав пока нет</div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentChapters.map((ch: any) => (
              <div key={ch.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{ch.title || 'Без названия'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {(ch.anime as any)?.title_ru ?? `Аниме #${ch.anime_id}`}
                  </p>
                </div>
                <div className="text-gray-600 text-xs shrink-0">
                  {new Date(ch.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <Link href={`/chapter/${ch.id}`} className="text-xs text-gray-500 hover:text-[#E8409A] transition-colors shrink-0">
                  Читать →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
