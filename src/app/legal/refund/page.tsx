import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О пожертвованиях — AniContinue",
  description: "Информация о добровольных пожертвованиях в поддержку проекта AniContinue.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-gray-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-gray-300">
      <h1 className="text-3xl font-bold text-white mb-2">О пожертвованиях</h1>
      <p className="text-sm text-gray-500 mb-10">Дата вступления в силу: 19 апреля 2026 г.</p>

      {/* Key info block */}
      <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 mb-10">
        <h2 className="text-white font-bold mb-3">Главное</h2>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            Пожертвование — добровольное. Никто не обязан платить.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            Первые 3 генерации — всегда бесплатно для всех.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            Генерации в ответ на донат — знак благодарности, не гарантированная услуга.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">!</span>
            Пожертвования не возвращаются — это их правовая природа по ст. 572 ГК РФ.
          </li>
        </ul>
      </div>

      <Section title="1. Правовая природа пожертвований">
        <p>
          Финансовая поддержка проекта AniContinue осуществляется в форме добровольного
          пожертвования (дарения) в соответствии со статьёй 572 Гражданского кодекса
          Российской Федерации.
        </p>
        <p>
          Пожертвование является безвозмездным — Жертвователь не приобретает никаких прав
          требования в обмен на переданные средства. Закон РФ № 2300-1 «О защите прав
          потребителей» к данным отношениям не применяется, поскольку они не являются
          договором купли-продажи или возмездного оказания услуг.
        </p>
      </Section>

      <Section title="2. Возврат средств">
        <p>
          2.1. В соответствии с правовой природой пожертвования возврат добровольно
          переданных средств не предусмотрен.
        </p>
        <p>
          2.2. <strong className="text-white">Технические ошибки:</strong> если при
          совершении пожертвования через платформу Boosty произошло двойное списание
          или иная техническая ошибка — обратитесь в службу поддержки Boosty напрямую.
          Они несут ответственность за корректность платёжных операций на своей платформе.
        </p>
        <p>
          2.3. Если вы считаете, что произошла исключительная ситуация — напишите на
          <span className="text-[#E8409A] ml-1">support@anicontinue.ru</span>.
          Мы рассмотрим каждый случай индивидуально и постараемся помочь, однако
          не несём юридической обязанности по возврату пожертвований.
        </p>
      </Section>

      <Section title="3. Если генерации не были начислены">
        <p>
          3.1. Если вы сделали пожертвование, отправили письмо на
          <span className="text-[#E8409A] ml-1">support@anicontinue.ru</span>,
          но генерации не были добавлены в течение 24 часов — напишите нам повторно.
        </p>
        <p>
          3.2. Мы обязательно добавим генерации. Наша цель — быть благодарными каждому
          кто нас поддержал.
        </p>
      </Section>

      <Section title="4. Контакты">
        <p>
          По всем вопросам:{" "}
          <span className="text-[#E8409A]">support@anicontinue.ru</span>
        </p>
        <p>
          Вопросы по платёжным операциям на Boosty:{" "}
          <span className="text-[#E8409A]">boosty.to</span> → служба поддержки Boosty.
        </p>
      </Section>
    </div>
  );
}
