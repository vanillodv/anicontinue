import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CatalogClient from "./CatalogClient";
import { Anime } from "@/types";

export const metadata: Metadata = {
  title: "Каталог аниме",
  description: "Выбери аниме из каталога — более 100 тайтлов от классики до сезонных новинок. Продолжи любимую историю вместе с AI.",
  alternates: { canonical: "https://www.anicontinue.ru/catalog" },
  openGraph: {
    title: "Каталог аниме — AniContinue",
    description: "Выбери аниме из каталога — более 100 тайтлов от классики до сезонных новинок. Продолжи любимую историю вместе с AI.",
    url: "https://www.anicontinue.ru/catalog",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Каталог аниме AniContinue" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Каталог аниме — AniContinue",
    description: "Выбери аниме из каталога — более 100 тайтлов от классики до сезонных новинок.",
    images: ["/og-image.svg"],
  },
};

export const revalidate = 3600; // кэш 1 час

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('anime')
    .select('*')
    .order('score', { ascending: false });

  return <CatalogClient initialAnime={(data ?? []) as Anime[]} />;
}
