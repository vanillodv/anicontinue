"use client";

import Link from "next/link";
import { Heart, Sparkles, ArrowLeft, Check, MessageCircle, Star } from "lucide-react";

const BOOSTY_URL = "https://boosty.to/anicontinue";

const suggestions = [
  {
    label: "Небольшая поддержка",
    amount: "100–299 ₽",
    color: { border: "border-white/10", badge: "bg-gray-500/20 text-gray-300", glow: "" },
    perks: [
      "Наша искренняя благодарность",
      "Около 10 генераций в подарок",
      "Помогаешь покрыть расходы на AI",
    ],
  },
  {
    label: "Хорошая поддержка",
    amount: "300–699 ₽",
    badge: "Популярный выбор",
    color: { border: "border-pink-500/30", badge: "bg-pink-500/20 text-pink-300", glow: "shadow-[0_0_30px_rgba(232,64,154,0.15)]" },
    perks: [
      "Большое спасибо от команды",
      "Около 30 генераций в подарок",
      "Поддерживаешь развитие сервиса",
    ],
  },
  {
    label: "Щедрая поддержка",
    amount: "700 ₽ и больше",
    color: { border: "border-purple-500/40", badge: "bg-purple-500/20 text-purple-300", glow: "shadow-[0_0_40px_rgba(139,92,246,0.2)]" },
    perks: [
      "Огромное спасибо!",
      "Около 100 генераций в подарок",
      "Твоё имя в списке меценатов",
    ],
  },
];

const steps = [
  {
    n: "1",
    title: "Переходи на Boosty",
    desc: "Нажми кнопку ниже — откроется страница поддержки проекта на Boosty.",
  },
  {
    n: "2",
    title: "Выбери любую сумму",
    desc: "Никаких обязательных тарифов. Поддержи на столько, на сколько считаешь нужным.",
  },
  {
    n: "3",
    title: "Напиши нам на почту",
    desc: "Отправь подтверждение доната на support@anicontinue.ru — укажи свой email в AniContinue.",
  },
  {
    n: "4",
    title: "Получи генерации в подарок",
    desc: "Мы добавим генерации вручную в течение 24 часов как знак благодарности.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0D0D1A] text-white py-16">
      <div className="container mx-auto px-6 max-w-5xl">

        {/* Back */}
        <Link href="/profile" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Назад в профиль
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 mb-6">
            <Heart className="w-8 h-8 text-[#E8409A]" />
          </div>
          <h1 className="text-5xl font-bold mb-5">Поддержи проект</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            AniContinue существует благодаря поддержке таких же фанатов аниме, как ты.
            Каждый донат помогает оплачивать серверы и AI — в ответ мы дарим генерации.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm">
            ✓ Первые 3 генерации — всегда бесплатно
          </div>
        </div>

        {/* Suggestion cards */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-gray-300 mb-6 text-center">
            Ориентировочные суммы поддержки
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {suggestions.map((s) => (
              <div
                key={s.label}
                className={`relative flex flex-col bg-[#1A1A2E] border ${s.color.border} rounded-3xl p-8 ${s.color.glow} transition-all duration-300`}
              >
                {s.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#E8409A] text-white text-xs font-bold rounded-full uppercase tracking-wide whitespace-nowrap">
                    {s.badge}
                  </div>
                )}
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 ${s.color.badge}`}>
                  {s.label}
                </div>
                <div className="text-3xl font-extrabold mb-6">{s.amount}</div>
                <ul className="space-y-3 flex-grow">
                  {s.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Important disclaimer */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 text-center text-sm text-gray-500 leading-relaxed">
            Суммы и количество генераций носят <strong className="text-gray-400">ориентировочный, необязательный характер</strong>.
            Это добровольное пожертвование — генерации предоставляются как знак благодарности,
            а не как гарантированная услуга.
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mb-20">
          <a
            href={BOOSTY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#E8409A] hover:bg-[#d13589] text-white font-bold py-5 px-12 rounded-2xl transition-all text-lg shadow-lg shadow-[#E8409A]/20 hover:scale-105"
          >
            <Heart className="w-6 h-6" />
            Поддержать на Boosty
          </a>
          <p className="mt-4 text-gray-600 text-sm">
            Boosty — российская платформа поддержки авторов
          </p>
        </div>

        {/* How it works */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Как это работает</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-4 items-start bg-[#1A1A2E] border border-white/5 rounded-2xl p-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E8409A]/10 border border-[#E8409A]/30 flex items-center justify-center text-[#E8409A] font-bold text-lg">
                  {s.n}
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">{s.title}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#1A1A2E] border border-white/5 rounded-3xl p-10 mb-10">
          <h2 className="text-xl font-bold mb-6">Частые вопросы</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            {[
              {
                q: "Я обязан платить?",
                a: "Нет. Первые 3 генерации всегда бесплатны. Поддержка — добровольная, без каких-либо обязательств с твоей стороны.",
              },
              {
                q: "Что если я задоначу, а генерации не придут?",
                a: "Напиши на support@anicontinue.ru с подтверждением доната. Мы всегда на связи и добавим генерации вручную.",
              },
              {
                q: "Генерации сгорают?",
                a: "Нет. Подаренные генерации не ограничены по времени — пользуйся когда угодно.",
              },
              {
                q: "Можно ли вернуть пожертвование?",
                a: "По природе пожертвования возврат не предусмотрен. Если произошла техническая ошибка при оплате — напиши нам, разберёмся индивидуально.",
              },
              {
                q: "Почему Boosty, а не карта напрямую?",
                a: "Boosty — надёжная российская платформа с защитой платежей. Так безопаснее для всех.",
              },
              {
                q: "Как долго ждать генерации?",
                a: "Обычно добавляем в течение нескольких часов, максимум — 24 часа. По будням быстрее.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-semibold text-white mb-1">{q}</p>
                <p className="text-gray-400">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legal notice */}
        <p className="text-center text-xs text-gray-600 leading-relaxed">
          Поддержка проекта является добровольным пожертвованием в соответствии со ст. 572 ГК РФ
          и не образует договора возмездного оказания услуг.{" "}
          <Link href="/legal/offer" className="text-[#E8409A] hover:underline">Условия поддержки</Link>
          {" "}·{" "}
          <Link href="/legal/privacy" className="text-[#E8409A] hover:underline">Политика конфиденциальности</Link>
        </p>

      </div>
    </main>
  );
}
