import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AnimeDetailsClient from "./AnimeDetailsClient";
import AnimeChaptersFeed from "./AnimeChaptersFeed";

export const revalidate = 3600;

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: anime } = await supabase
    .from("anime")
    .select("title_ru, title_en, synopsis, poster_url")
    .eq("id", id)
    .single();
  if (!anime) return { title: "Аниме не найдено" };
  const title = anime.title_ru || anime.title_en || "Аниме";
  const synopsisSnippet = (anime.synopsis || "").slice(0, 155);
  return {
    title,
    description: synopsisSnippet || `Создай фанфик-главу по «${title}» вместе с AI.`,
    openGraph: {
      title: `${title} — AniContinue`,
      description: synopsisSnippet,
      images: anime.poster_url ? [{ url: anime.poster_url, alt: title }] : undefined,
    },
  };
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Получаем аниме
  const { data: anime } = await supabase.from('anime').select('*').eq('id', id).single();
  if (!anime) notFound();

  // Проверяем наличие глав пользователя
  const { data: { user } } = await supabase.auth.getUser();
  let lastChapter = null;

  if (user) {
    const { data } = await supabase
      .from('chapters')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('anime_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    lastChapter = data;
  }

  return (
    <>
      <AnimeDetailsClient
        anime={anime}
        lastChapter={lastChapter}
      />
      <div style={{ padding: "0 44px 120px", maxWidth: 1400, margin: "0 auto" }}>
        <AnimeChaptersFeed animeId={Number(id)} animeName={anime.title_ru || anime.title_en || ""} />
      </div>
    </>
  );
}
