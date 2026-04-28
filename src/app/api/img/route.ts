import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'cdn.myanimelist.net',
  'myanimelist.net',
  'api-cdn.myanimelist.net',
  'cdn-us.myanimelist.net',
];

// 1×1 прозрачный PNG. На полный фейл отдаём 200+png (а не 502),
// чтобы next/image корректно срабатывал onError → AnimeCard покажет 続.
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

// Один источник: fetch с таймаутом, проверка что это реально image, возврат
// либо буфера+content-type, либо описания фейла. Не бросает.
async function tryFetch(
  name: string,
  url: string,
  timeoutMs: number
): Promise<{ name: string; ok: true; buffer: ArrayBuffer; contentType: string } | { name: string; ok: false; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      next: { revalidate: 86400 },
      signal: controller.signal,
    });
    if (!res.ok) return { name, ok: false, reason: `${res.status}` };
    const contentType = res.headers.get('Content-Type') || '';
    if (!contentType.startsWith('image/')) {
      return { name, ok: false, reason: `non-image:${contentType.slice(0, 20)}` };
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) return { name, ok: false, reason: `too-small:${buffer.byteLength}` };
    return { name, ok: true, buffer, contentType };
  } catch (e) {
    return { name, ok: false, reason: (e as Error)?.name || 'err' };
  } finally {
    clearTimeout(timer);
  }
}

// Race по группе: возвращает первый ok-результат, либо все reasons.
async function raceGroup(
  attempts: Array<{ name: string; url: string }>,
  timeoutMs: number
): Promise<
  | { ok: true; buffer: ArrayBuffer; contentType: string; winner: string; failures: string[] }
  | { ok: false; failures: string[] }
> {
  const failures: string[] = [];
  const promises = attempts.map((a) => tryFetch(a.name, a.url, timeoutMs));

  // Promise.any возвращает первый fulfilled с ok=true; иначе AggregateError.
  // Реализуем вручную, т.к. ok=false тоже fulfilled, нам нужен первый ok=true.
  return new Promise((resolve) => {
    let pending = promises.length;
    promises.forEach((p) => {
      p.then((r) => {
        if (r.ok) {
          resolve({ ok: true, buffer: r.buffer, contentType: r.contentType, winner: r.name, failures });
          return;
        }
        failures.push(`${r.name}=${r.reason}`);
        if (--pending === 0) resolve({ ok: false, failures });
      });
    });
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  // Стратегия: 2 параллельные группы по 2 источника, race внутри группы,
  // group2 запускается только если group1 не нашла ничего за 3s.
  // Worst case: 6s до placeholder вместо прежних 32s.
  const group1 = await raceGroup(
    [
      { name: 'direct', url },
      { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
    ],
    3000
  );

  const allFailures: string[] = [];

  if (group1.ok) {
    return new NextResponse(group1.buffer, {
      headers: {
        'Content-Type': group1.contentType,
        // Год immutable-кеш в браузере: после первого успеха пользователь
        // больше не дёргает /api/img на этот url.
        'Cache-Control': 'public, max-age=31536000, immutable, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'X-Img-Source': group1.winner,
        'X-Img-Failures': group1.failures.join(',') || 'none',
      },
    });
  }
  allFailures.push(...group1.failures);

  const group2 = await raceGroup(
    [
      { name: 'corsproxy', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
      { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
    ],
    3000
  );

  if (group2.ok) {
    return new NextResponse(group2.buffer, {
      headers: {
        'Content-Type': group2.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'X-Img-Source': group2.winner,
        'X-Img-Failures': [...allFailures, ...group2.failures].join(','),
      },
    });
  }
  allFailures.push(...group2.failures);

  console.warn(`[img] all sources failed for ${parsed.hostname}: ${allFailures.join(' | ')}`);

  // 200 + прозрачный 1×1: next/image вызовет onError → fallback "続".
  // Кеш 5 минут — даём шанс прокси восстановиться без флэша placeholder'ов.
  return new NextResponse(new Uint8Array(TRANSPARENT_PNG), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'X-Img-Source': 'fallback-placeholder',
      'X-Img-Failures': allFailures.join(','),
    },
  });
}
