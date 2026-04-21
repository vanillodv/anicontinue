/**
 * Оборачивает URL картинки MAL в наш прокси,
 * чтобы обойти hotlink-блокировку CDN.
 *
 * Jikan возвращает разные хосты: cdn.myanimelist.net, myanimelist.net,
 * иногда api-cdn.myanimelist.net. Все они бьются hotlink-защитой (Referer-чек),
 * поэтому гоним через /api/img, который подставляет Referer: myanimelist.net.
 */
const MAL_HOSTS = new Set([
  'cdn.myanimelist.net',
  'myanimelist.net',
  'api-cdn.myanimelist.net',
  'cdn-us.myanimelist.net',
]);

export function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (MAL_HOSTS.has(parsed.hostname)) {
      return `/api/img?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // невалидный URL — вернём как есть
  }
  return url;
}
