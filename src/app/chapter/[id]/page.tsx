import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/admin/guard";
import { notFound } from "next/navigation";
import ChapterReader from "./ChapterReader";
import JsonLd from "@/components/seo/JsonLd";
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

  // Имя автора берём service-клиентом — RLS на profiles иначе вернёт null
  // для чужих юзеров, и в JSON-LD автор оказался бы без имени.
  let authorName: string | null = null;
  if ((chapter as any).user_id) {
    const svc = serviceClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("username")
      .eq("id", (chapter as any).user_id)
      .single();
    authorName = profile?.username ?? null;
  }

  // Приведение типов для TS, так как select с join возвращает сложную структуру
  const typedChapter = chapter as any as Chapter;
  const typedAnime = (chapter as any).anime as Pick<Anime, 'id' | 'title_ru' | 'title_en' | 'poster_url'>;

  const animeName = typedAnime?.title_ru || typedAnime?.title_en || "Аниме";
  const chapterUrl = `https://www.anicontinue.ru/chapter/${id}`;

  // JSON-LD: Article (наиболее подходящий тип для отдельной главы фанфика)
  // + BreadcrumbList. Поле inLanguage — критично для русскоязычного индекса
  // Яндекса.
  const chapterLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: typedChapter.title || `Глава по «${animeName}»`,
      description: ((typedChapter.content as string) || "")
        .replace(/\s+/g, " ")
        .slice(0, 250)
        .trim() || `Фанфик-глава по «${animeName}».`,
      url: chapterUrl,
      datePublished: typedChapter.created_at,
      dateModified: typedChapter.created_at,
      inLanguage: "ru-RU",
      isFamilyFriendly: true,
      author: {
        "@type": "Person",
        name: authorName || "Аноним",
      },
      publisher: {
        "@type": "Organization",
        name: "AniContinue",
        logo: {
          "@type": "ImageObject",
          url: "https://www.anicontinue.ru/logo.svg",
        },
      },
      image: typedAnime?.poster_url ? proxyImage(typedAnime.poster_url) : undefined,
      isPartOf: typedAnime
        ? {
            "@type": "TVSeries",
            name: animeName,
            url: `https://www.anicontinue.ru/anime/${typedAnime.id}`,
          }
        : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.anicontinue.ru" },
        { "@type": "ListItem", position: 2, name: "Каталог", item: "https://www.anicontinue.ru/catalog" },
        ...(typedAnime
          ? [{ "@type": "ListItem", position: 3, name: animeName, item: `https://www.anicontinue.ru/anime/${typedAnime.id}` }]
          : []),
        {
          "@type": "ListItem",
          position: typedAnime ? 4 : 3,
          name: typedChapter.title || "Глава",
          item: chapterUrl,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={chapterLd} />
      <ChapterReader
        chapter={typedChapter}
        anime={typedAnime}
      />
    </>
  );
}
