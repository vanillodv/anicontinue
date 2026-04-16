import { Anime } from '@/types';

const BASE_URL = 'https://api.jikan.moe/v4';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJikan(endpoint: string) {
  await delay(500); // Rate limit protection
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    if (response.status === 429) {
      await delay(1000);
      return fetchJikan(endpoint);
    }
    throw new Error(`Jikan API error: ${response.statusText}`);
  }
  return response.json();
}

function mapJikanToAnime(data: any): Anime {
  return {
    id: data.mal_id,
    title_ru: null, // Jikan doesn't provide Russian titles by default
    title_en: data.title_english || data.title,
    title_jp: data.title_japanese,
    synopsis: data.synopsis,
    genres: data.genres?.map((g: any) => g.name) || [],
    characters: [], // Separate call needed usually
    poster_url: data.images?.webp?.large_image_url || data.images?.jpg?.large_image_url,
    score: data.score,
    year: data.year || data.aired?.prop?.from?.year,
    studio: data.studios?.[0]?.name,
    episodes: data.episodes,
    status: data.status,
    prompt_template: null,
    cached_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

export async function getTopAnime(page = 1, limit = 20): Promise<Anime[]> {
  try {
    const { data } = await fetchJikan(`/top/anime?page=${page}&limit=${limit}`);
    return data.map(mapJikanToAnime);
  } catch (error) {
    console.error('Error fetching top anime:', error);
    return [];
  }
}

export async function searchAnime(query: string): Promise<Anime[]> {
  try {
    const { data } = await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=20`);
    return data.map(mapJikanToAnime);
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
}

export async function getAnimeById(id: number): Promise<Anime | null> {
  try {
    const { data } = await fetchJikan(`/anime/${id}`);
    return mapJikanToAnime(data);
  } catch (error) {
    console.error(`Error fetching anime ${id}:`, error);
    return null;
  }
}
