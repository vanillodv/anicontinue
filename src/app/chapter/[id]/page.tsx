import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChapterReader from "./ChapterReader";
import { Chapter, Anime } from "@/types";

interface ChapterPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Получаем главу с данными об аниме
  const { data: chapter, error } = await supabase
    .from('chapters')
    .select(`
      *,
      anime (
        id,
        title_ru,
        title_en,
        poster_url
      )
    `)
    .eq('id', id)
    .single();

  if (error || !chapter) {
    notFound();
  }

  // Приведение типов для TS, так как select с join возвращает сложную структуру
  const typedChapter = chapter as any as Chapter;
  const typedAnime = (chapter as any).anime as Pick<Anime, 'id' | 'title_ru' | 'title_en' | 'poster_url'>;

  return (
    <main className="min-h-screen bg-[#0D0D1A]">
      <ChapterReader 
        chapter={typedChapter} 
        anime={typedAnime} 
      />
    </main>
  );
}
