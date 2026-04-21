"use client";

import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

const BOOSTY_URL = "https://boosty.to/anicontinue";

const suggestions = [
  {
    label: "Небольшая поддержка",
    amount: "100–299 ₽",
    kanji: "小",
    perks: [
      "Наша искренняя благодарность",
      "Около 10 генераций в подарок",
      "Помогаешь покрыть расходы на AI",
    ],
  },
  {
    label: "Хорошая поддержка",
    amount: "300–699 ₽",
    kanji: "中",
    highlight: true,
    perks: [
      "Большое спасибо от команды",
      "Около 30 генераций в подарок",
      "Поддерживаешь развитие сервиса",
    ],
  },
  {
    label: "Щедрая поддержка",
    amount: "700 ₽ и больше",
    kanji: "大",
    perks: [
      "Огромное спасибо!",
      "Около 100 генераций в подарок",
      "Твоё имя в списке меценатов",
    ],
  },
];

const steps = [
  { n: "一", title: "Переходи на Boosty", desc: "Нажми кнопку ниже — откроется страница поддержки проекта на Boosty." },
  { n: "二", title: "Выбери любую сумму", desc: "Никаких обязательных тарифов. Поддержи на столько, на сколько считаешь нужным." },
  { n: "三", title: "Напиши нам на почту", desc: "Отправь подтверждение доната на support@anicontinue.ru — укажи свой email в AniContinue." },
  { n: "四", title: "Получи генерации в подарок", desc: "Мы добавим генерации вручную в течение 24 часов как знак благодарности." },
];

const faqs = [
  { q: "Я обязан платить?", a: "Нет. Первые 3 генерации всегда бесплатны. Поддержка — добровольная, без каких-либо обязательств с твоей стороны." },
  { q: "Что если я задоначу, а генерации не придут?", a: "Напиши на support@anicontinue.ru с подтверждением доната. Мы всегда на связи и добавим генерации вручную." },
  { q: "Генерации сгорают?", a: "Нет. Подаренные генерации не ограничены по времени — пользуйся когда угодно." },
  { q: "Можно ли вернуть пожертвование?", a: "По природе пожертвования возврат не предусмотрен. Если произошла техническая ошибка при оплате — напиши нам, разберёмся индивидуально." },
  { q: "Почему Boosty, а не карта напрямую?", a: "Boosty — надёжная российская платформа с защитой платежей. Так безопаснее для всех." },
  { q: "Как долго ждать генерации?", a: "Обычно добавляем в течение нескольких часов, максимум — 24 часа. По будням быстрее." },
];

export default function PricingPage() {
  return (
    <div style={{ padding: "44px 44px 120px", maxWidth: 1100, margin: "0 auto" }}>

      <Link
        href="/profile"
        className="inline-flex items-center gap-2 transition-colors mb-12"
        style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cinnabar)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ash)")}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Назад в профиль
      </Link>

      {/* Hero */}
      <div className="text-center mb-20">
        <div className="ac-eyebrow mb-6 justify-center">
          <span className="dot" />
          <span>支援 · Support</span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(48px, 7vw, 88px)",
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            marginBottom: 20,
          }}
        >
          Поддержи <b style={{ fontStyle: "normal", fontWeight: 900 }}>проект</b>
        </h1>
        <p className="max-w-2xl mx-auto" style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ash)" }}>
          AniContinue существует благодаря поддержке таких же фанатов аниме, как ты.
          Каждый донат помогает оплачивать серверы и AI — в ответ мы дарим генерации.
        </p>
        <div
          className="mt-6 inline-flex items-center gap-2 px-4 py-2"
          style={{
            background: "rgba(223,181,94,0.08)",
            border: "1px solid rgba(223,181,94,0.4)",
            color: "var(--gold)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          ✓ Первые 3 генерации — всегда бесплатно
        </div>
      </div>

      {/* Cards */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <div className="ac-eyebrow justify-center">
            <span className="line" />
            <span>Ориентировочные суммы</span>
            <span className="line" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ border: "1px solid var(--line-strong)" }}>
          {suggestions.map((s, i) => (
            <div
              key={s.label}
              className="relative flex flex-col p-8"
              style={{
                background: s.highlight ? "rgba(232,93,79,0.06)" : "var(--paper-2)",
                borderRight: i < suggestions.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              {s.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 whitespace-nowrap"
                  style={{
                    background: "var(--cinnabar)",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  Популярный выбор
                </div>
              )}

              <div
                className="self-start mb-5"
                style={{
                  fontFamily: "var(--font-jp)",
                  fontWeight: 900,
                  fontSize: 40,
                  lineHeight: 1,
                  color: s.highlight ? "var(--cinnabar)" : "var(--ash)",
                  opacity: s.highlight ? 1 : 0.5,
                }}
              >
                {s.kanji}
              </div>

              <div
                className="mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ash)",
                }}
              >
                {s.label}
              </div>
              <div
                className="mb-6"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 900,
                  fontSize: 32,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                {s.amount}
              </div>

              <ul className="space-y-3 flex-grow">
                {s.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ink)", opacity: 0.85 }}>
                    <span style={{ color: "var(--cinnabar)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>—</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p
          className="mt-6 p-5 text-center leading-relaxed"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--line)",
            fontSize: 13,
            color: "var(--ash)",
          }}
        >
          Суммы и количество генераций носят{" "}
          <strong style={{ color: "var(--ink)" }}>ориентировочный, необязательный характер</strong>.
          Это добровольное пожертвование — генерации предоставляются как знак благодарности,
          а не как гарантированная услуга.
        </p>
      </section>

      {/* Big CTA */}
      <div className="text-center mb-24 relative">
        <div
          className="absolute inset-0 grid place-items-center pointer-events-none"
          style={{
            fontFamily: "var(--font-jp)",
            fontWeight: 900,
            fontSize: "clamp(240px, 35vw, 460px)",
            color: "var(--cinnabar)",
            opacity: 0.06,
            lineHeight: 0.85,
            letterSpacing: "-0.05em",
          }}
        >
          感謝
        </div>
        <div className="relative z-[2]">
          <a
            href={BOOSTY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ac-btn cinnabar"
            style={{ padding: "18px 40px", fontSize: 14 }}
          >
            <Heart className="w-4 h-4" /> Поддержать на Boosty
          </a>
          <p className="mt-4" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
            Boosty — российская платформа поддержки авторов
          </p>
        </div>
      </div>

      {/* Steps */}
      <section className="mb-24">
        <div className="text-center mb-12">
          <div className="ac-sec-title">
            <div className="kicker">Process · 手順</div>
            <h2 style={{ textAlign: "center" }}>Как это <b>работает</b></h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0" style={{ border: "1px solid var(--line-strong)" }}>
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="flex gap-4 items-start p-7"
              style={{
                background: "var(--paper-2)",
                borderRight: i % 2 === 0 ? "1px solid var(--line)" : "none",
                borderBottom: i < 2 ? "1px solid var(--line)" : "none",
              }}
            >
              <div
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                style={{
                  background: "rgba(232,93,79,0.1)",
                  border: "1px solid rgba(232,93,79,0.4)",
                  color: "var(--cinnabar)",
                  fontFamily: "var(--font-jp)",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {s.n}
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 18, color: "var(--ink)", marginBottom: 6 }}>
                  {s.title}
                </h3>
                <p className="leading-relaxed" style={{ fontSize: 14, color: "var(--ash)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12" style={{ background: "var(--paper-2)", border: "1px solid var(--line-strong)", padding: 44 }}>
        <div className="text-center mb-10">
          <div className="ac-sec-title">
            <div className="kicker">FAQ · よくある質問</div>
            <h2 style={{ textAlign: "center" }}>Частые <b>вопросы</b></h2>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <p
                className="mb-2 flex gap-2 items-start"
                style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 16, color: "var(--ink)", letterSpacing: "-0.01em" }}
              >
                <span style={{ color: "var(--cinnabar)" }}>—</span>
                {q}
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ash)", paddingLeft: 18 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Legal */}
      <p className="text-center leading-relaxed" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}>
        Поддержка является добровольным пожертвованием по ст. 572 ГК РФ
        <br />
        <Link href="/legal/offer" className="underline" style={{ color: "var(--cinnabar)" }}>Условия поддержки</Link>
        {" · "}
        <Link href="/legal/privacy" className="underline" style={{ color: "var(--cinnabar)" }}>Политика конфиденциальности</Link>
      </p>

      <style>{`
        @media (max-width: 1100px) {
          main > div { padding: 32px 24px 80px !important; }
        }
      `}</style>
    </div>
  );
}
