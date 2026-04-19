import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = ['cdn.myanimelist.net', 'cdn.myanimelist.net'];

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

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://myanimelist.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      // кешируем на 24 часа на сервере
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
