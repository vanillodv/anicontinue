import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, BookOpen, Sparkles, User } from "lucide-react";

interface Props {
  animeId: number;
  animeName: string;
}

export default async function AnimeChaptersFeed({ animeId, animeName }: Props) {
  const supabase = await createClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select(`
      id,
      title,
      content,
      created_at,
      likes_count,
      comments_count,
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
    <section className="mt-20 border-t border-white/5 pt-16">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[#E8409A]" />
            Главы от фанатов
          </h2>
          {list.length > 0 && (
            <p className="text-gray-500 text-sm mt-1">
              {list.length === 12 ? "Последние 12 глав · " : `${list.length} ${plural(list.length, "глава", "главы", "глав")} · `}
              написанных по аниме «{animeName}»
            </p>
          )}
        </div>
        {list.length > 0 && (
          <Link
            href="/community"
            className="text-sm text-gray-500 hover:text-[#E8409A] transition-colors"
          >
            Все главы сообщества →
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        /* Empty state */
        <div className="py-20 flex flex-col items-center text-center gap-5 bg-[#1A1A2E] border border-dashed border-white/10 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-[#E8409A]" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Пока нет глав</p>
            <p className="text-gray-500 text-sm mt-1">Станьте первым, кто продолжит эту историю!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((ch) => {
            const preview = ch.content?.replace(/\n+/g, " ").slice(0, 160).trim();
            const author = ch.profiles?.username ?? "Аноним";
            const date = new Date(ch.created_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <article
                key={ch.id}
                className="group bg-[#1A1A2E] border border-white/5 hover:border-[#E8409A]/30 rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
              >
                {/* Title */}
                <h3 className="text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-[#E8409A] transition-colors">
                  {ch.title || "Без названия"}
                </h3>

                {/* Preview */}
                {preview && (
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 flex-1">
                    {preview}…
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-gray-600 pt-1 border-t border-white/5">
                  <div className="w-5 h-5 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/20 flex items-center justify-center shrink-0">
                    <User className="w-2.5 h-2.5 text-[#E8409A]" />
                  </div>
                  <span className="truncate max-w-[110px] text-gray-400">{author}</span>
                  <span className="ml-auto shrink-0">{date}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/chapter/${ch.id}`}
                    className="flex-1 text-center bg-[#7B61FF] hover:bg-[#6545e0] text-white text-sm font-semibold py-2 rounded-xl transition-all"
                  >
                    Читать
                  </Link>
                  <div className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-xl text-xs text-gray-500">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    {ch.likes_count ?? 0}
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-xl text-xs text-gray-500">
                    <MessageCircle className="w-3.5 h-3.5 text-[#E8409A]" />
                    {ch.comments_count ?? 0}
                  </div>
                </div>
              </article>
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
