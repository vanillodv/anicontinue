import Link from "next/link";

const docs = [
  { href: "/legal/offer",   label: "Условия поддержки" },
  { href: "/legal/terms",   label: "Соглашение" },
  { href: "/legal/privacy", label: "Приватность" },
  { href: "/legal/refund",  label: "Пожертвования" },
  { href: "/legal/license", label: "Лицензия" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="ac-line-bottom" style={{ background: "rgba(242,235,217,0.02)" }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-5 items-center">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--ash)",
            }}
          >
            法律 · Legal
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {docs.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors legal-nav-link"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  opacity: 0.7,
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {children}
      <style>{`
        .legal-nav-link:hover { opacity: 1 !important; color: var(--cinnabar) !important; }
      `}</style>
    </div>
  );
}
