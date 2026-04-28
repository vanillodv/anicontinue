import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // В Vercel/YC установлена NEXT_PUBLIC_APP_URL=https://www.anicontinue.ru.
  // NEXT_PUBLIC_SITE_URL не существует — раньше был fallback на vercel.app,
  // что приводило к индексации второго домена → дубль контента.
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://www.anicontinue.ru';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/settings',
          '/profile/',
          '/auth/',
          '/payment/',
          '/maintenance',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
