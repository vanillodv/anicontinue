import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chapters } = await supabase
    .from("chapters")
    .select(`
      id,
      title,
      content,
      created_at,
      rating,
      likes_count,
      comments_count,
      is_public,
      scene_params,
      anime!chapters_anime_id_fkey (
        id,
        title_ru,
        title_en,
        poster_url
      )
    `)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0D0D1A] py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-white">Мои главы</h1>
            <p className="text-gray-500 text-sm mt-1">Все написанные истории, сгруппированные по аниме</p>
          </div>
          <Link
            href="/profile"
            className="text-sm text-gray-500 hover:text-[#E8409A] transition-colors"
          >
            ← Профиль
          </Link>
        </div>

        <HistoryClient chapters={(chapters ?? []) as any} />
      </div>
    </main>
  );
}
