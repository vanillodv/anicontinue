import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'cdn.myanimelist.net',
  'myanimelist.net',
  'api-cdn.myanimelist.net',
  'cdn-us.myanimelist.net',
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'No URL' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Разрешаем только MAL CDN
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  // Пытаемся достать постер несколькими путями по очереди.
  // MAL CDN геоблокирует IP Яндекс.Облака + wsrv.nl недавно добавил
  // myanimelist.net в TLD-blocklist. Оставляем fallback-цепочку.
  const attempts: Array<{ name: string; url: string }> = [
    // 1. Прямой MAL — вдруг отдаст. Дёшево если работает.
    {
      name: 'direct',
      url,
    },
    // 2. codetabs proxy — на момент деплоя отдаёт MAL корректно (image/jpeg, image/webp).
    {
      name: 'codetabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    },
  ];

  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        headers: {
          'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Referer': 'https://myanimelist.net/',
        },
        // кешируем на сутки на стороне сервера
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;

      const contentType = res.headers.get('Content-Type') || '';
      // codetabs иногда заворачивает ошибки в text/html — отбрасываем
      if (!contentType.startsWith('image/')) continue;

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 100) continue; // слишком маленький = не картинка

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
          'X-Img-Source': a.name,
        },
      });
    } catch {
      // пробуем следующий вариант
      continue;
    }
  }

  return new NextResponse(null, { status: 502 });
}
