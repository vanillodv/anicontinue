import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChapterReader from "./ChapterReader";
import { Chapter, Anime } from "@/types";
import { proxyImage } from "@/lib/proxyImage";

interface ChapterPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ch } = await supabase
    .from("chapters")
    .select("title, content, anime(title_ru, title_en, poster_url)")
    .eq("id", id)
    .single();
  if (!ch) return { title: "Глава не найдена" };
  const anime = (ch as any).anime;
  const title = ch.title || "Без названия";
  const animeName = anime?.title_ru || anime?.title_en || "Аниме";
  const snippet = ((ch.content as string) || "").replace(/\s+/g, " ").slice(0, 155).trim();
  const description = snippet || `Фанфик-глава по «${animeName}».`;
  const canonicalUrl = `https://www.anicontinue.ru/chapter/${id}`;
  return {
    title: `${title} — ${animeName}`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${title} · ${animeName}`,
      description,
      url: canonicalUrl,
      type: 'article',
      // Жмём через /api/img — MAL hotlink-режет прямые запросы без Referer,
      // соцсети бы получили 403 и не отрисовали превью.
      images: anime?.poster_url ? [{ url: proxyImage(anime.poster_url)!, alt: animeName }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${animeName}`,
      description,
      images: anime?.poster_url ? [proxyImage(anime.poster_url)!] : undefined,
    },
  };
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
    <ChapterReader
      chapter={typedChapter}
      anime={typedAnime}
    />
  );
}
