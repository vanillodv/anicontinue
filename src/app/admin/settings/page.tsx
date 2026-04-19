"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Settings } from "lucide-react";

interface SiteSettings {
  default_chapters_limit: string;
  registration_enabled: string;
  maintenance_mode: string;
  site_notice: string;
}

const DEFAULTS: SiteSettings = {
  default_chapters_limit: '3',
  registration_enabled: 'true',
  maintenance_mode: 'false',
  site_notice: '',
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => setSettings({ ...DEFAULTS, ...data }))
      .finally(() => setIsLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) return <div className="text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-[#E8409A]" /> Настройки сайта
        </h1>
        <p className="text-gray-500 text-sm mt-1">Глобальные параметры платформы</p>
      </div>

      <div className="space-y-6">

        {/* Генерации для новых юзеров */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-white">Генерации</h2>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Глав для новых пользователей</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="9999"
                value={settings.default_chapters_limit}
                onChange={e => setSettings(s => ({ ...s, default_chapters_limit: e.target.value }))}
                className="w-28 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-[#E8409A]/50"
              />
              <span className="text-gray-500 text-sm">глав бесплатно при регистрации</span>
            </div>
            <p className="text-xs text-gray-600">
              Сейчас в коде жёстко прописано 3. После добавления поддержки динамического лимита это значение будет применяться автоматически.
            </p>
          </div>
        </div>

        {/* Доступность сайта */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-white">Доступность</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Регистрация открыта</p>
              <p className="text-xs text-gray-500 mt-0.5">Позволяет новым пользователям создавать аккаунты</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, registration_enabled: s.registration_enabled === 'true' ? 'false' : 'true' }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.registration_enabled === 'true' ? 'bg-[#E8409A]' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.registration_enabled === 'true' ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Режим обслуживания</p>
              <p className="text-xs text-gray-500 mt-0.5">Показывает страницу "Сайт на обслуживании" для всех кроме админа</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, maintenance_mode: s.maintenance_mode === 'true' ? 'false' : 'true' }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.maintenance_mode === 'true' ? 'bg-orange-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenance_mode === 'true' ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Объявление */}
        <div className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6 space-y-3">
          <h2 className="font-bold text-white">Объявление для пользователей</h2>
          <textarea
            value={settings.site_notice}
            onChange={e => setSettings(s => ({ ...s, site_notice: e.target.value }))}
            placeholder="Пусто — объявление не показывается..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#E8409A]/50 placeholder:text-gray-600"
          />
          <p className="text-xs text-gray-600">Будет отображаться баннером на главной странице (требует интеграции в layout)</p>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold rounded-xl transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✓ Сохранено!' : <><Save className="w-4 h-4" /> Сохранить</>}
      </button>
    </div>
  );
}
