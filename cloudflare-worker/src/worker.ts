// Cloudflare Worker — тонкий прокси к api.anthropic.com.
// YC Serverless Container живёт в РФ, Anthropic отвечает нам оттуда 403
// "Request not allowed". CF Worker выполняется на edge Cloudflare (не РФ),
// поэтому для Anthropic запросы идут как разрешённые.
//
// Shared secret: чтобы любой проходимец, узнавший URL воркера, не гонял
// через нас свои запросы и не съедал наш бесплатный CF-тир, принимаем
// запросы только с header `x-anicontinue-proxy-secret` = env.PROXY_SECRET.

const TARGET_ORIGIN = 'https://api.anthropic.com';

export interface Env {
  PROXY_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('x-anicontinue-proxy-secret') !== env.PROXY_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    const target = TARGET_ORIGIN + url.pathname + url.search;

    // Копируем заголовки, убираем наш shared secret и Host (CF его подставит сам).
    const headers = new Headers(request.headers);
    headers.delete('x-anicontinue-proxy-secret');
    headers.delete('host');

    // Для GET/HEAD тела нет, а duplex:'half' требуется CF Workers только
    // когда реально передаётся поток тела.
    const init: RequestInit = { method: request.method, headers };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      // @ts-expect-error — поле duplex не во всех типах, но CF его требует для streaming body
      init.duplex = 'half';
    }

    // fetch возвращает Response со streaming body — отдаём его как есть,
    // SSE (message streaming Anthropic) работает без буферизации.
    const upstream = await fetch(target, init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  },
};
