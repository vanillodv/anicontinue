import Link from "next/link";

const navLinks = [
  { href: "/catalog",   label: "Каталог" },
  { href: "/community", label: "Сообщество" },
  { href: "/feedback",  label: "Пожелания" },
  { href: "/pricing",   label: "Поддержка" },
];

const legalLinks = [
  { href: "/legal/offer",   label: "Условия поддержки" },
  { href: "/legal/terms",   label: "Пользовательское соглашение" },
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/refund",  label: "О пожертвованиях" },
  { href: "/legal/license", label: "Лицензионное соглашение" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ac-line-top mt-12" style={{ padding: "60px 44px 32px" }}>
      <div className="grid gap-10 md:gap-[50px]" style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr", maxWidth: "1400px", margin: "0 auto" }}>

        {/* Brand + disclaimer */}
        <div className="footer-brand" style={{ maxWidth: 320 }}>
          <Link href="/" className="flex items-center gap-2.5" style={{ fontFamily: "var(--font-serif)", fontWeight: 900 }}>
            <span className="ac-seal">続</span>
            <span className="text-[20px]" style={{ color: "var(--ink)" }}>AniContinue</span>
          </Link>
          <p className="mt-4 text-[13px] leading-[1.55]" style={{ color: "var(--ash)" }}>
            Фанфик-платформа для поклонников аниме. Все произведения принадлежат своим правообладателям; контент создаётся пользователями и ИИ в жанре фанфикшн.
          </p>
        </div>

        {/* Nav */}
        <div>
          <h5 className="mb-4 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--ash)", fontFamily: "var(--font-mono)" }}>
            Навигация
          </h5>
          <nav className="flex flex-col">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="py-1.5 text-[14px] transition-opacity"
                style={{ color: "var(--ink)", opacity: 0.75 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1", e.currentTarget.style.color = "var(--cinnabar)")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.75", e.currentTarget.style.color = "var(--ink)")}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Legal */}
        <div>
          <h5 className="mb-4 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--ash)", fontFamily: "var(--font-mono)" }}>
            Правовое
          </h5>
          <nav className="flex flex-col">
            {legalLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="py-1.5 text-[14px] transition-opacity"
                style={{ color: "var(--ink)", opacity: 0.75 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1", e.currentTarget.style.color = "var(--cinnabar)")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.75", e.currentTarget.style.color = "var(--ink)")}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Contacts */}
        <div>
          <h5 className="mb-4 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--ash)", fontFamily: "var(--font-mono)" }}>
            Контакты
          </h5>
          <div className="flex flex-col">
            <a
              href="mailto:support@anicontinue.ru"
              className="py-1.5 text-[14px] transition-opacity"
              style={{ color: "var(--ink)", opacity: 0.75 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1", e.currentTarget.style.color = "var(--cinnabar)")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.75", e.currentTarget.style.color = "var(--ink)")}
            >
              support@anicontinue.ru
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="col-span-full mt-10 pt-6 flex flex-wrap justify-between items-center gap-3"
          style={{ borderTop: "1px solid var(--line)", fontFamily: "var(--font-mono)", color: "var(--ash)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase" }}
        >
          <span>AniContinue © {year} · Сделано с любовью к аниме</span>
          <span style={{ fontFamily: "var(--font-jp)" }}>続き物語</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          footer > div { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
        }
        @media (max-width: 620px) {
          footer { padding: 40px 24px 24px !important; }
          footer > div { grid-template-columns: 1fr !important; gap: 30px !important; }
        }
      `}</style>
    </footer>
  );
}
