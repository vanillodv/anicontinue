import { NextRequest } from 'next/server';

// Прокси к api.anthropic.com для обхода РФ-геоблока Anthropic.
// Выполняется в Edge Runtime, pinned в iad1 (US East), поэтому исходящий запрос
// к Anthropic уходит из США независимо от того откуда пришёл клиент.
// Используется JARVIS на VPS из РФ — туда настраивается ANTHROPIC_BASE_URL +
// OAUTH_TOKEN_URL на этот endpoint.
//
// Защита: shared-secret в заголовке X-Proxy-Secret. Если ENV ANTHROPIC_PROXY_SECRET
// не задан — прокси открыт (для отладки). На проде секрет обязателен.

export const runtime = 'edge';
export const preferredRegion = 'iad1';
export const dynamic = 'force-dynamic';

const TARGET_ORIGIN = 'https://api.anthropic.com';

// Заголовки, которые Vercel/прокси добавляет к входящему запросу — их нельзя
// форвардить апстриму, иначе Anthropic увидит чужие хосты/IP и может отказать.
const STRIP_HEADERS = [
  'host',
  'x-proxy-secret',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-vercel-deployment-url',
  'x-vercel-id',
  'x-vercel-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
];

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const secret = process.env.ANTHROPIC_PROXY_SECRET;
  if (secret && request.headers.get('x-proxy-secret') !== secret) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  const target = TARGET_ORIGIN + '/' + path.join('/') + url.search;

  const headers = new Headers(request.headers);
  for (const h of STRIP_HEADERS) headers.delete(h);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // duplex обязателен для стриминга тела в fetch (Edge Runtime).
    // @ts-expect-error поле не во всех типах TypeScript, но рантайм требует
    init.duplex = 'half';
  }

  const upstream = await fetch(target, init);

  // Стримим тело как есть — это нужно для SSE (streaming сообщений Anthropic).
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
