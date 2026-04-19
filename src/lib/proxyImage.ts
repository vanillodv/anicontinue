/**
 * Оборачивает URL картинки MAL в наш прокси,
 * чтобы обойти hotlink-блокировку CDN.
 */
export function proxyImage(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'cdn.myanimelist.net') {
      return `/api/img?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // невалидный URL — вернём как есть
  }
  return url;
}
