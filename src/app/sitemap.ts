import { createClient } from '@/lib/supabase/server';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // В Vercel/YC установлена NEXT_PUBLIC_APP_URL — fallback на прод-домен,
  // чтобы случайно не утянуть в индекс vercel.app или yc preview.
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://www.anicontinue.ru';
  const supabase = await createClient();

  // 500 — потолок Supabase REST PostgREST по умолчанию. У нас 244 аниме
  // и ~62 публичных глав, так что лимит не достигаем.
  const [{ data: anime }, { data: chapters }] = await Promise.all([
    supabase.from('anime').select('id, cached_at').limit(500),
    supabase
      .from('chapters')
      .select('id, created_at')
      .eq('is_public', true)
      .eq('is_deleted', false)
      .limit(500),
  ]);

  // Статика. Не включаем /admin, /settings, /profile, /login, /api —
  // они либо приватные (login wall), либо noindex по природе.
  // legal/* — низкий приоритет, но индексировать стоит (доверие, E-A-T).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                       lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/catalog`,          lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/community`,        lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${base}/feedback`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${base}/pricing`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/legal/offer`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/terms`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/privacy`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/refund`,     lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/license`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const animeRoutes: MetadataRoute.Sitemap = (anime ?? []).map((a) => ({
    url: `${base}/anime/${a.id}`,
    lastModified: a.cached_at ? new Date(a.cached_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const chapterRoutes: MetadataRoute.Sitemap = (chapters ?? []).map((c) => ({
    url: `${base}/chapter/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'never',
    priority: 0.6,
  }));

  return [...staticRoutes, ...animeRoutes, ...chapterRoutes];
}
