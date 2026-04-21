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
    <div style={{ padding: "44px 44px 120px", maxWidth: 1100, margin: "0 auto" }}>
      <div className="mb-12 flex items-end justify-between flex-wrap gap-4">
        <div className="ac-sec-title">
          <div className="kicker">История · History</div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 0.95,
              letterSpacing: "-0.025em",
            }}
          >
            Все мои <b style={{ fontStyle: "normal", fontWeight: 900 }}>главы</b>
          </h1>
          <p className="mt-2" style={{ fontSize: 14, color: "var(--ash)" }}>
            Истории, написанные по тайтлам, сгруппированные по аниме.
          </p>
        </div>
        <Link href="/profile" className="ac-sec-link">← Профиль</Link>
      </div>

      <HistoryClient chapters={(chapters ?? []) as any} />

      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 32px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
