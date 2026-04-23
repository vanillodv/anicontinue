"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";

const EXAMPLE = {
  anime: "Атака Титанов",
  mood: "Драма",
  title: "Между двумя приказами",
  text: `Эрен не заметил, как сжал кулак — пальцы побелели от напряжения. Напротив него, по ту сторону деревянного стола, Микаса молчала. Она всегда молчала, когда могла ударить. Но сейчас между ними лежала только карта — помятая, с обугленным правым углом — и Эрен впервые понял: Микаса злится не на него. Она злится на то, что больше не может его защитить.

Армин вошёл тихо, принёс запах дождя и керосина. Положил на стол вторую карту, свою, и медленно разгладил её ладонью.

— Они знают, — сказал он. — Знают и ждут.

— Сколько у нас времени? — голос Эрена прозвучал ровно, будто он спрашивал про чай.

— Один день. Может, меньше.

Микаса наконец подняла голову. Её глаза были темнее обычного — не злые, а усталые.

— Ты собираешься уйти один.

Это не было вопросом. Эрен не стал лгать.

— Если я возьму вас, мы потеряем всех троих. Если один — только меня.

— Мы потеряем тебя, — поправил Армин.

В комнате было тихо так, как бывает только в деревне после войны — когда птицы ещё не вернулись, а колокола уже отлили новые. Эрен посмотрел на свои руки. На них до сих пор оставались следы трансформации — тонкие, как порезы от бумаги, но не заживающие.

— Я не могу вас с собой брать, — сказал он. — Потому что знаю, чем всё закончится. И вы — тоже знаете. Мы все трое это видели, когда я прикоснулся к Зику на пути. Только никто не хочет говорить вслух.

Микаса встала. Её стул не скрипнул — она двигалась слишком аккуратно, как всегда, когда внутри неё шла война.

— Тогда я иду с тобой. До того места. Не дальше.

— Микаса…

— Это не предложение. Это условие.

Армин тихо улыбнулся. Не от радости — от того, что узнал их обоих заново в эту секунду.

— Значит, завтра на рассвете, — сказал он. — До северных ворот. Я отвлеку патрули.

Эрен хотел сказать «нет». Хотел отправить их спать, ругать, вытолкать. Но вместо этого кивнул. Потому что впервые за три года понял: они не отпустят его именно потому, что он их просит. И это — единственная причина, по которой он ещё не сдался.

На следующее утро небо над Парадизом было цвета пепла. Ветер дул с моря, нёс запах соли и чужих кораблей. Три фигуры вышли из окраинного дома и пошли на север — не оборачиваясь, потому что дом, который оставляешь, всегда легче оставлять со спины.

У Микасы на поясе был шарф. Старый, красный, с полинявшими концами. Эрен узнал его только на третьем шаге.

— Ты сохранила.

— Конечно, — сказала она. — Он мне ещё нужен.

И Эрен впервые за долгое время подумал, что, возможно, не всё уже решено.`,
};

export default function ExamplePreview() {
  const [open, setOpen] = useState(false);

  return (
    <section style={{ padding: "80px 44px 0" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div
          className="overflow-hidden transition-all"
          style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)" }}
        >
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-4 p-5 md:p-7 text-left transition-colors"
            style={{ background: "transparent" }}
          >
            <div
              className="shrink-0 w-12 h-12 flex items-center justify-center"
              style={{
                background: "rgba(var(--rgb-cinnabar),0.12)",
                border: "1px solid rgba(var(--rgb-cinnabar),0.4)",
                color: "var(--cinnabar)",
                fontFamily: "var(--font-jp)",
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              見
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ash)",
                  marginBottom: 4,
                }}
              >
                Пример · Sample · {EXAMPLE.anime} · {EXAMPLE.mood}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                «{EXAMPLE.title}» — посмотри, как пишет AI
              </div>
            </div>
            <ChevronDown
              className="shrink-0 transition-transform"
              style={{
                width: 20,
                height: 20,
                color: "var(--ash)",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {open && (
            <div
              className="px-5 md:px-7 pb-7"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  lineHeight: 1.75,
                  color: "var(--ink)",
                  opacity: 0.9,
                  marginTop: 24,
                  whiteSpace: "pre-wrap",
                }}
              >
                {EXAMPLE.text}
              </div>

              <div
                className="mt-8 pt-6 flex flex-wrap items-center justify-between gap-4"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ash)",
                  }}
                >
                  Это 500 слов · полная глава — ~2000 слов
                </div>
                <Link href="/catalog" className="ac-btn cinnabar">
                  <Sparkles className="w-3.5 h-3.5" /> Создать свою главу
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
