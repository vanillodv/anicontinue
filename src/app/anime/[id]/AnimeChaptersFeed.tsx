import { serviceClient } from "@/lib/admin/guard";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";

interface Props {
  animeId: number;
  animeName: string;
}

export default async function AnimeChaptersFeed({ animeId, animeName }: Props) {
  const supabase = serviceClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select(`
      id, title, content, created_at, likes_count, comments_count,
      profiles!chapters_user_id_fkey ( username )
    `)
    .eq("anime_id", animeId)
    .eq("is_public", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(12);

  const list = (chapters ?? []) as unknown as Array<{
    id: string;
    title: string | null;
    content: string;
    created_at: string;
    likes_count: number;
    comments_count: number;
    profiles: { username: string | null } | null;
  }>;

  return (
    <section className="ac-line-top pt-16 mt-12">
      <div className="grid gap-6 items-end mb-10" style={{ gridTemplateColumns: "auto 1fr auto" }}>
        <div className="ac-sec-num hidden md:block">零参</div>
        <div className="ac-sec-title">
          <div className="kicker">03 · Community</div>
          <h2>Главы от <b>фанатов</b></h2>
          {list.length > 0 && (
            <p className="mt-2" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
              {list.length === 12 ? "Последние 12 глав · " : `${list.length} ${plural(list.length, "глава", "главы", "глав")} · `}
              «{animeName}»
            </p>
          )}
        </div>
        {list.length > 0 && (
          <Link href="/community" className="ac-sec-link">
            Все главы →
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <div
          className="py-20 flex flex-col items-center text-center gap-4"
          style={{ border: "1px dashed var(--line-strong)", borderRadius: 2, background: "var(--paper-2)" }}
        >
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{ background: "rgba(232,93,79,0.12)", border: "1px solid rgba(232,93,79,0.4)", borderRadius: 2, color: "var(--cinnabar)", fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 28 }}
          >
            続
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 20, color: "var(--ink)" }}>
              Пока нет глав
            </p>
            <p className="mt-1" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
              Станьте первым, кто продолжит эту историю
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {list.map((ch) => {
            const preview = ch.content?.replace(/\n+/g, " ").slice(0, 160).trim();
            const author = ch.profiles?.username ?? "Аноним";
            const date = new Date(ch.created_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <Link
                key={ch.id}
                href={`/chapter/${ch.id}`}
                className="group relative flex flex-col gap-3 p-6 transition-all"
                style={{ background: "var(--paper-2)", border: "1px solid var(--line)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cinnabar)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
              >
                <div
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cinnabar)" }}
                >
                  {date}
                </div>

                <h3
                  style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 20, lineHeight: 1.15, color: "var(--ink)", letterSpacing: "-0.01em" }}
                  className="line-clamp-2"
                >
                  {ch.title || "Без названия"}
                </h3>

                {preview && (
                  <p
                    className="line-clamp-3 flex-1"
                    style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ash)" }}
                  >
                    {preview}…
                  </p>
                )}

                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
                >
                  <span className="truncate max-w-[140px]" style={{ color: "var(--ink)" }}>@{author}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><Heart className="w-3 h-3" style={{ color: "var(--cinnabar)" }} />{ch.likes_count ?? 0}</span>
                    <span className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3" />{ch.comments_count ?? 0}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
