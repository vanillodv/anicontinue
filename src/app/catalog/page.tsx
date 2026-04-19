import { createClient } from "@/lib/supabase/server";
import CatalogClient from "./CatalogClient";
import { Anime } from "@/types";

export const revalidate = 3600; // кэш 1 час

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('anime')
    .select('*')
    .order('score', { ascending: false });

  return <CatalogClient initialAnime={(data ?? []) as Anime[]} />;
}
