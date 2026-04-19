import Link from "next/link";

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
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-[#E8409A] font-bold text-lg">AniContinue</span>
            <span className="text-gray-600 text-sm">© {year}</span>
          </div>

          {/* Legal links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {legalLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Contact */}
          <a
            href="mailto:support@anicontinue.ru"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            support@anicontinue.ru
          </a>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-6 leading-relaxed">
          AniContinue — фанфик-платформа. Все аниме-произведения принадлежат своим
          правообладателям. Контент создаётся пользователями и ИИ в жанре фанфикшн
          и не претендует на права оригинальных авторов.
        </p>
      </div>
    </footer>
  );
}
