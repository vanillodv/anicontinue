import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AnimeDetailsClient from "./AnimeDetailsClient";
import AnimeChaptersFeed from "./AnimeChaptersFeed";

export const revalidate = 3600;

interface AnimePageProps {
  params: Promise<{ id: string }>;
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
    <main className="min-h-screen bg-[#0D0D1A] pt-16">
      <AnimeDetailsClient
        anime={anime}
        lastChapter={lastChapter}
      />
      <div className="container mx-auto px-4 md:px-6 pb-12 md:pb-20 max-w-7xl">
        <AnimeChaptersFeed animeId={Number(id)} animeName={anime.title_ru || anime.title_en || ""} />
      </div>
    </main>
  );
}
