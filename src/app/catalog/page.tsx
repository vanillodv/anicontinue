import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CatalogClient from "./CatalogClient";
import JsonLd from "@/components/seo/JsonLd";
import { Anime } from "@/types";

export const metadata: Metadata = {
  title: "Каталог аниме — 240+ тайтлов для AI-фанфиков",
  description:
    "Каталог 240+ аниме от классики Гибли до новинок 2026 года. Выбирай тайтл и пиши свою главу — AI продолжит историю в атмосфере оригинала за 30 секунд.",
  keywords: [
    "каталог аниме",
    "список аниме для фанфика",
    "топ аниме",
    "популярные аниме",
    "AniContinue каталог",
  ],
  alternates: { canonical: "https://www.anicontinue.ru/catalog" },
  openGraph: {
    title: "Каталог аниме — 240+ тайтлов для AI-фанфиков",
    description:
      "Каталог 240+ аниме от классики Гибли до новинок 2026 года. Выбирай тайтл и пиши свою главу.",
    url: "https://www.anicontinue.ru/catalog",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Каталог аниме AniContinue" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Каталог аниме — 240+ тайтлов",
    description:
      "Каталог 240+ аниме. Выбирай тайтл и пиши свою главу с AI.",
    images: ["/og-image.svg"],
  },
};

export const revalidate = 3600; // кэш 1 час

const breadcrumbsLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.anicontinue.ru" },
    { "@type": "ListItem", position: 2, name: "Каталог", item: "https://www.anicontinue.ru/catalog" },
  ],
};

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('anime')
    .select('*')
    .order('score', { ascending: false });

  return (
    <>
      <JsonLd data={breadcrumbsLd} />
      <CatalogClient initialAnime={(data ?? []) as Anime[]} />
    </>
  );
}
