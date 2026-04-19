// src/types/supabase.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          role: 'user' | 'moderator' | 'admin' | 'super_admin'
          plan: 'free' | 'fan' | 'otaku'
          chapters_used: number
          chapters_limit: number
          chapters_reset_at: string | null
          created_at: string
        }
        Insert: { id: string; username?: string | null; role?: 'user'; plan?: 'free'; chapters_used?: number; chapters_limit?: number }
        Update: { username?: string | null; role?: string; plan?: string; chapters_used?: number; chapters_limit?: number }
      }
      anime: {
        Row: {
          id: number
          title_ru: string
          title_jp: string | null
          title_en: string | null
          synopsis: string | null
          ending_context: string | null
          genres: Json
          characters: Json
          poster_url: string | null
          score: number | null
          year: number | null
          studio: string | null
          episodes: number | null
          status: string | null
          created_at: string
        }
        Insert: { id: number; title_ru: string }
        Update: { title_ru?: string }
      }
      chapters: {
        Row: {
          id: string
          user_id: string
          anime_id: number
          title: string | null
          content: string
          summary: string | null
          rating: number | null
          is_public: boolean
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          created_at: string
        }
        Insert: { user_id: string; anime_id: number; content: string }
        Update: { title?: string | null; content?: string; is_public?: boolean; is_deleted?: boolean }
      }
      ai_prompts: {
        Row: {
          id: string
          version: string
          system_prompt: string
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: { version: string; system_prompt: string; is_active?: boolean }
        Update: { is_active?: boolean }
      }
      // Остальные таблицы можно добавить по мере необходимости
    }
  }
}