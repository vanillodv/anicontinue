import { createClient } from '@/lib/supabase/server';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // См. robots.ts: используем APP_URL (реально установлена в Vercel), fallback на прод-домен.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.anicontinue.ru';
  const supabase = await createClient();

  const [{ data: anime }, { data: chapters }] = await Promise.all([
    supabase.from('anime').select('id, cached_at').limit(500),
    supabase.from('chapters').select('id, created_at').eq('is_public', true).eq('is_deleted', false).limit(500),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,             lastModified: new Date(), changeFrequency: 'daily',   priority: 1 },
    { url: `${base}/catalog`,    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/community`,  lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.8 },
  ];

  const animeRoutes: MetadataRoute.Sitemap = (anime ?? []).map(a => ({
    url: `${base}/anime/${a.id}`,
    lastModified: new Date(a.cached_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const chapterRoutes: MetadataRoute.Sitemap = (chapters ?? []).map(c => ({
    url: `${base}/chapter/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'never',
    priority: 0.5,
  }));

  return [...staticRoutes, ...animeRoutes, ...chapterRoutes];
}
