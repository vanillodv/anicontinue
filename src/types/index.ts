export type Plan = 'free' | 'fan' | 'otaku';

export interface Anime {
  id: number;
  title_ru: string | null;
  title_jp: string | null;
  title_en: string | null;
  synopsis: string | null;
  genres: any;
  characters: any;
  poster_url: string | null;
  score: number | null;
  year: number | null;
  studio: string | null;
  episodes: number | null;
  status: string | null;
  prompt_template: string | null;
  ending_context: string | null;
  cached_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  plan: Plan;
  chapters_used: number;
  chapters_limit: number;
  subscription_expires_at: string | null;
  created_at: string;
}

export interface SceneParams {
  mood?: string;
  focusCharacter?: string;
  sceneType?: 'continuation' | 'alternative';
}

export interface Chapter {
  id: string;
  user_id: string;
  anime_id: number;
  title: string | null;
  content: string;
  rating: number | null;
  scene_params: SceneParams;
  character_id: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  appearance: string | null;
  personality: string | null;
  ability: string | null;
  relation: string | null;
  appearances_count: number;
  is_saved: boolean;
  created_at: string;
}
