type EventName = 'view_anime' | 'start_generation' | 'chapter_saved' | 'chapter_liked' | 'page_view';

export async function track(
  eventName: EventName,
  eventData: Record<string, any> = {},
  sessionId: string = 'unknown'
) {
  // Клиентская сторона — fire-and-forget
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: eventName, event_data: eventData, session_id: sessionId }),
      keepalive: true,
    });
  } catch {
    // Аналитика не должна ломать UX
  }
}
