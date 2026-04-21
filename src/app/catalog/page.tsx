import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CatalogClient from "./CatalogClient";
import { Anime } from "@/types";

export const metadata: Metadata = {
  title: "Каталог аниме",
  description: "Выбери аниме из каталога — более 100 тайтлов от классики до сезонных новинок. Продолжи любимую историю вместе с AI.",
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
