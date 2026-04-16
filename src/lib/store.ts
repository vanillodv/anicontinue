import { create } from 'zustand';
import { Anime } from '@/types';

interface AnimeStore {
  selectedAnime: Anime | null;
  setSelectedAnime: (anime: Anime) => void;
  favorites: Anime[];
  addFavorite: (anime: Anime) => void;
  removeFavorite: (animeId: number) => void;
  isFavorite: (animeId: number) => boolean;
}

export const useAnimeStore = create<AnimeStore>((set, get) => ({
  selectedAnime: null,
  setSelectedAnime: (anime) => set({ selectedAnime: anime }),
  
  favorites: [],
  addFavorite: (anime) => set((state) => ({
    favorites: [...state.favorites, anime]
  })),
  removeFavorite: (animeId) => set((state) => ({
    favorites: state.favorites.filter((a) => a.id !== animeId)
  })),
  isFavorite: (animeId) => get().favorites.some((a) => a.id === animeId),
}));
