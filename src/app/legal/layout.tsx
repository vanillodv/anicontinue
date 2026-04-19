import Link from "next/link";

const docs = [
  { href: "/legal/offer",   label: "Условия поддержки" },
  { href: "/legal/terms",   label: "Пользовательское соглашение" },
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/refund",  label: "О пожертвованиях" },
  { href: "/legal/license", label: "Лицензионное соглашение" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Top nav between docs */}
      <div className="border-b border-white/5 bg-white/2">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap gap-4">
          {docs.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs text-gray-400 hover:text-[#E8409A] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
