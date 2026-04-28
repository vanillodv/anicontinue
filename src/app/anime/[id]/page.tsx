import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AnimeDetailsClient from "./AnimeDetailsClient";
import AnimeChaptersFeed from "./AnimeChaptersFeed";
import RelatedAnime from "./RelatedAnime";
import JsonLd from "@/components/seo/JsonLd";
import { proxyImage } from "@/lib/proxyImage";

export const revalidate = 3600;

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

// Валидация id — anime.id это bigint в БД. Защищаемся от мусора в URL,
// чтобы не делать заведомо пустой запрос и не получать «висячий» 404.
function parseAnimeId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 2 ** 53 ? n : null;
}

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseAnimeId(rawId);
  if (id === null) return { title: "Аниме не найдено" };
  const supabase = await createClient();
  const { data: anime } = await supabase
    .from("anime")
    .select("title_ru, title_en, synopsis, poster_url")
    .eq("id", id)
    .single();
  if (!anime) return { title: "Аниме не найдено" };
  const title = anime.title_ru || anime.title_en || "Аниме";
  const synopsisSnippet = (anime.synopsis || "").slice(0, 155);
  const canonicalUrl = `https://www.anicontinue.ru/anime/${id}`;
  const description = synopsisSnippet || `Создай фанфик-главу по «${title}» вместе с AI.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${title} — AniContinue`,
      description,
      url: canonicalUrl,
      type: 'website',
      // MAL hotlink-режет прямые запросы. Для og:image проксируем через /api/img.
      images: anime.poster_url ? [{ url: proxyImage(anime.poster_url)!, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — AniContinue`,
      description,
      images: anime.poster_url ? [proxyImage(anime.poster_url)!] : undefined,
    },
  };
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id: rawId } = await params;
  const id = parseAnimeId(rawId);
  if (id === null) notFound();
  const supabase = await createClient();

  // Anime + user → параллельно (user не зависит от anime).
  const [animeRes, userRes] = await Promise.all([
    supabase.from('anime').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
  ]);

  const { data: anime } = animeRes;
  if (!anime) notFound();

  const user = userRes.data.user;
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

  // JSON-LD для страницы аниме: TVSeries + BreadcrumbList.
  // TVSeries — наиболее точный schema.org-тип для аниме (от ТВ-сериалов
  // схема Google различает плохо, но описательные поля те же).
  const animeUrl = `https://www.anicontinue.ru/anime/${id}`;
  const animeLd = [
    {
      "@context": "https://schema.org",
      "@type": "TVSeries",
      name: anime.title_ru || anime.title_en,
      alternateName: anime.title_en && anime.title_ru ? anime.title_en : undefined,
      url: animeUrl,
      description: anime.synopsis || undefined,
      image: anime.poster_url ? proxyImage(anime.poster_url) : undefined,
      genre: Array.isArray(anime.genres) ? anime.genres : undefined,
      datePublished: anime.year ? `${anime.year}-01-01` : undefined,
      productionCompany: anime.studio
        ? { "@type": "Organization", name: anime.studio }
        : undefined,
      numberOfEpisodes: anime.episodes || undefined,
      aggregateRating: anime.score
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(anime.score).toFixed(2),
            bestRating: "10",
            ratingCount: 1,
          }
        : undefined,
      inLanguage: "ja",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.anicontinue.ru" },
        { "@type": "ListItem", position: 2, name: "Каталог", item: "https://www.anicontinue.ru/catalog" },
        { "@type": "ListItem", position: 3, name: anime.title_ru || anime.title_en, item: animeUrl },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={animeLd} />
      <AnimeDetailsClient
        anime={anime}
        lastChapter={lastChapter}
      />
      <div style={{ padding: "0 44px 120px", maxWidth: 1400, margin: "0 auto" }}>
        <AnimeChaptersFeed animeId={id} animeName={anime.title_ru || anime.title_en || ""} />
        <RelatedAnime
          currentAnimeId={id}
          genres={Array.isArray(anime.genres) ? anime.genres : []}
        />
      </div>
    </>
  );
}
