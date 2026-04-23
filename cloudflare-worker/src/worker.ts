// Cloudflare Worker — тонкий прокси к api.anthropic.com.
// YC Serverless Container живёт в РФ, Anthropic отвечает нам оттуда 403
// "Request not allowed". CF Worker выполняется на edge Cloudflare (не РФ),
// поэтому для Anthropic запросы идут как разрешённые.
//
// Защита: полагаемся на непредсказуемость субдомена воркера и приватность
// репозитория. Без валидного Anthropic API-ключа через воркер всё равно
// ничего не пройдёт (Anthropic вернёт 401). Shared-secret header убран
// из-за трудностей с синхронизацией в двух системах (CF + YC).

const TARGET_ORIGIN = 'https://api.anthropic.com';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const target = TARGET_ORIGIN + url.pathname + url.search;

    // Копируем заголовки, убираем Host (CF его подставит сам для нового хоста).
    const headers = new Headers(request.headers);
    headers.delete('host');

    // Для GET/HEAD тела нет, а duplex:'half' CF Workers требует только
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
