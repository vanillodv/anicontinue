import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О пожертвованиях — AniContinue",
  description: "Информация о добровольных пожертвованиях в поддержку проекта AniContinue.",
};

export default function RefundPage() {
  return (
    <div className="legal-doc">
      <h1>О <b>пожертвованиях</b></h1>
      <p className="meta">Дата вступления в силу: 19.04.2026</p>

      <div className="callout" style={{ borderLeftColor: "var(--gold)", marginBottom: 36 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>
          Главное
        </div>
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          <li style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <span style={{ color: "#86EFAC", fontWeight: 900 }}>✓</span>
            <span>Пожертвование — добровольное. Никто не обязан платить.</span>
          </li>
          <li style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <span style={{ color: "#86EFAC", fontWeight: 900 }}>✓</span>
            <span>Первые 3 генерации — всегда бесплатно для всех.</span>
          </li>
          <li style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <span style={{ color: "#86EFAC", fontWeight: 900 }}>✓</span>
            <span>Генерации в ответ на донат — знак благодарности, не гарантированная услуга.</span>
          </li>
          <li style={{ display: "flex", gap: 12 }}>
            <span style={{ color: "var(--gold)", fontWeight: 900 }}>!</span>
            <span>Пожертвования не возвращаются — это их правовая природа по ст. 572 ГК РФ.</span>
          </li>
        </ul>
      </div>

      <section>
        <h2>1. Правовая природа пожертвований</h2>
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
      </section>

      <section>
        <h2>2. Возврат средств</h2>
        <p>
          2.1. В соответствии с правовой природой пожертвования возврат добровольно
          переданных средств не предусмотрен.
        </p>
        <p>
          2.2. <strong>Технические ошибки:</strong> если при совершении пожертвования
          через платформу Boosty произошло двойное списание или иная техническая ошибка —
          обратитесь в службу поддержки Boosty напрямую. Они несут ответственность за
          корректность платёжных операций на своей платформе.
        </p>
        <p>
          2.3. Если вы считаете, что произошла исключительная ситуация — напишите на{" "}
          <span className="accent">support@anicontinue.ru</span>.
          Мы рассмотрим каждый случай индивидуально и постараемся помочь, однако
          не несём юридической обязанности по возврату пожертвований.
        </p>
      </section>

      <section>
        <h2>3. Если генерации не были начислены</h2>
        <p>
          3.1. Если вы сделали пожертвование, отправили письмо на{" "}
          <span className="accent">support@anicontinue.ru</span>,
          но генерации не были добавлены в течение 24 часов — напишите нам повторно.
        </p>
        <p>
          3.2. Мы обязательно добавим генерации. Наша цель — быть благодарными каждому,
          кто нас поддержал.
        </p>
      </section>

      <section>
        <h2>4. Контакты</h2>
        <p>
          По всем вопросам: <span className="accent">support@anicontinue.ru</span>
        </p>
        <p>
          Вопросы по платёжным операциям на Boosty:{" "}
          <span className="accent">boosty.to</span> → служба поддержки Boosty.
        </p>
      </section>
    </div>
  );
}
