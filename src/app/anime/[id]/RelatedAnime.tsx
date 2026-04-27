import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { proxyImage } from "@/lib/proxyImage";

interface Props {
  currentAnimeId: number;
  genres: string[];
}

// Похожие аниме: подбираем по пересечению жанров с текущим тайтлом.
// Сортировка по score, чтобы в шорт-листе оказалось то, что обычно ищут.
// Это сильный SEO-сигнал внутренней перелинковки + CTR-усилитель.
export default async function RelatedAnime({ currentAnimeId, genres }: Props) {
  if (!genres || genres.length === 0) return null;

  const supabase = await createClient();

  // Берём первый жанр как основной фильтр; PostgreSQL @> — массив содержит
  // элемент. Для пары других жанров делать N запросов нет смысла.
  const primaryGenre = genres[0];
  const { data } = await supabase
    .from("anime")
    .select("id, title_ru, title_en, poster_url, score, year, studio, genres")
    .contains("genres", [primaryGenre])
    .neq("id", currentAnimeId)
    .order("score", { ascending: false })
    .limit(6);

  const list = data ?? [];
  if (list.length === 0) return null;

  return (
    <section className="ac-line-top pt-16 mt-12">
      <div className="grid gap-6 items-end mb-10" style={{ gridTemplateColumns: "auto 1fr auto" }}>
        <div className="ac-sec-num hidden md:block">零肆</div>
        <div className="ac-sec-title">
          <div className="kicker">04 · Related</div>
          <h2>Похожие <b>тайтлы</b></h2>
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--ash)",
            }}
          >
            По жанру «{primaryGenre}»
          </p>
        </div>
        <Link href="/catalog" className="ac-sec-link">Весь каталог →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {list.map((a) => (
          <Link key={a.id} href={`/anime/${a.id}`} className="group">
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "2/3",
                borderRadius: 2,
                boxShadow: "0 10px 30px -15px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--rgb-ink),0.06)",
              }}
            >
              {a.poster_url ? (
                <Image
                  src={proxyImage(a.poster_url)!}
                  alt={a.title_ru || a.title_en || "Постер аниме"}
                  fill
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1)] group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              ) : (
                <div className="w-full h-full" style={{ background: "var(--paper-2)" }} />
              )}
              {a.score && (
                <div
                  className="absolute top-2 left-2 z-[2] flex items-center gap-1"
                  style={{
                    background: "var(--ink)",
                    color: "var(--paper)",
                    padding: "2px 6px",
                    borderRadius: 1,
                    fontFamily: "var(--font-serif)",
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--cinnabar)" }}>★</span>
                  {Number(a.score).toFixed(1)}
                </div>
              )}
            </div>
            <div
              className="mt-2"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.2,
                color: "var(--ink)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {a.title_ru || a.title_en}
            </div>
            {a.year && (
              <div
                className="mt-1"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ash)",
                }}
              >
                {a.year}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
