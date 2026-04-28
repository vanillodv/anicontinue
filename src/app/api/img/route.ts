import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'cdn.myanimelist.net',
  'myanimelist.net',
  'api-cdn.myanimelist.net',
  'cdn-us.myanimelist.net',
];

// 1×1 прозрачный PNG. Используется как graceful-fallback вместо 502 —
// next/image на 502 показывает разорванную картинку, на 200+png корректно
// уйдёт в onError на клиенте → AnimeCard покажет иероглиф 続.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const COMMON_HEADERS = {
  Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Referer: 'https://myanimelist.net/',
};

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

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  // MAL CDN геоблокирует IP облаков (YC, Vercel, AWS) + wsrv.nl
  // добавил myanimelist.net в TLD-blocklist. Поэтому ходим через
  // несколько публичных read-only прокси по очереди.
  const attempts: Array<{ name: string; url: string; raw?: boolean }> = [
    { name: 'direct', url },
    {
      name: 'codetabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    },
    {
      name: 'corsproxy',
      url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
    },
    {
      name: 'allorigins',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      raw: true,
    },
  ];

  const failures: string[] = [];

  for (const a of attempts) {
    try {
      // 8s таймаут на источник — не блокируем запрос больше 32s суммарно
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(a.url, {
        headers: COMMON_HEADERS,
        next: { revalidate: 86400 },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        failures.push(`${a.name}=${res.status}`);
        continue;
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.startsWith('image/')) {
        failures.push(`${a.name}=non-image:${contentType.slice(0, 30)}`);
        continue;
      }

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 100) {
        failures.push(`${a.name}=too-small:${buffer.byteLength}`);
        continue;
      }

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
          'X-Img-Source': a.name,
          'X-Img-Failures': failures.join(',') || 'none',
        },
      });
    } catch (e) {
      failures.push(`${a.name}=${(e as Error)?.name || 'err'}`);
      continue;
    }
  }

  // Все 4 прокси упали — диагностика в headers + 200 c прозрачной заглушкой.
  // Это ВАЖНО: next/image на 502 ломает Layout Shift, на 200+png корректно
  // отработает onError на клиенте.
  console.warn(`[img] all sources failed for ${parsed.hostname}: ${failures.join(' | ')}`);

  return new NextResponse(new Uint8Array(TRANSPARENT_PNG), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'X-Img-Source': 'fallback-placeholder',
      'X-Img-Failures': failures.join(','),
    },
  });
}
