import { Anime, JikanResponse } from '@/types';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

async function jikanFetch(endpoint: string): Promise<JikanResponse> {
  const response = await fetch(`${JIKAN_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Jikan API error: ${response.status}`);
  }
  return response.json();
}

export async function getTopAnime(page = 1): Promise<Anime[]> {
  const { data } = await jikanFetch(`/top/anime?page=${page}&limit=20`);
  return data as Anime[];
}

export async function searchAnime(query: string): Promise<Anime[]> {
  const { data } = await jikanFetch(`/anime?q=${encodeURIComponent(query)}&limit=20`);
  return data as Anime[];
}

export async function getAnimeById(id: number): Promise<Anime> {
  const { data } = await jikanFetch(`/anime/${id}/full`);
  return data as unknown as Anime;
}
