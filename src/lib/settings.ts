import { serviceClient } from '@/lib/admin/guard';

export interface SiteSettings {
  default_chapters_limit: number;
  registration_enabled: boolean;
  maintenance_mode: boolean;
  site_notice: string;
}

const DEFAULTS: SiteSettings = {
  default_chapters_limit: 3,
  registration_enabled: true,
  maintenance_mode: false,
  site_notice: '',
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data } = await serviceClient()
      .from('site_settings')
      .select('key, value');

    if (!data) return DEFAULTS;

    const raw: Record<string, string> = {};
    for (const row of data) raw[row.key] = row.value;

    return {
      default_chapters_limit: parseInt(raw.default_chapters_limit ?? '3', 10) || 3,
      registration_enabled: (raw.registration_enabled ?? 'true') !== 'false',
      maintenance_mode: (raw.maintenance_mode ?? 'false') === 'true',
      site_notice: raw.site_notice ?? '',
    };
  } catch {
    return DEFAULTS;
  }
}
