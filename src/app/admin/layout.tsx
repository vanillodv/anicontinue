import Link from 'next/link';
import { LayoutDashboard, Users, ShieldAlert, Cpu, BarChart2, Lightbulb, BookImage, Settings, Gift, AlertTriangle } from 'lucide-react';
import { requireAdminPage } from '@/lib/admin/guard';

const NAV = [
  { href: '/admin',              label: 'Дашборд',    icon: LayoutDashboard },
  { href: '/admin/users',        label: 'Юзеры',      icon: Users },
  { href: '/admin/moderation',   label: 'Модерация',  icon: ShieldAlert },
  { href: '/admin/anime',        label: 'Каталог',    icon: BookImage },
  { href: '/admin/ai',           label: 'AI промпты', icon: Cpu },
  { href: '/admin/analytics',    label: 'Аналитика',  icon: BarChart2 },
  { href: '/admin/grants',       label: 'Начисления', icon: Gift },
  { href: '/admin/errors',       label: 'Ошибки',     icon: AlertTriangle },
  { href: '/admin/suggestions',  label: 'Пожелания',  icon: Lightbulb },
  { href: '/admin/settings',     label: 'Настройки',  icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="min-h-screen bg-[#0D0D1A] flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/5 bg-[#1A1A2E] flex flex-col py-8 px-4 gap-1">
        <div className="text-[#E8409A] font-black text-lg mb-6 px-2">⚙️ Admin</div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
