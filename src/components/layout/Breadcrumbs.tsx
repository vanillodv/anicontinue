import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string; // отсутствует для последнего
}

interface Props {
  items: Crumb[];
  className?: string;
}

// Серверный компонент. Стиль соответствует существующим breadcrumbs
// в /anime/[id] и /chapter/[id] (mono, uppercase, ash-color).
// hover-эффект сделан через CSS-класс .ac-bc-link, без onMouseEnter
// (Next.js 16 не любит inline-handlers в server components).
export default function Breadcrumbs({ items, className = "" }: Props) {
  return (
    <nav
      aria-label="Хлебные крошки"
      className={`flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 ${className}`}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "var(--ash)",
      }}
    >
      <Link href="/" className="ac-bc-link flex items-center gap-1">
        <Home className="w-3 h-3" /> Главная
      </Link>
      {items.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2">
          <ChevronRight className="w-3 h-3" />
          {crumb.href ? (
            <Link href={crumb.href} className="ac-bc-link">
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: "var(--ink)" }} className="truncate max-w-[40ch]">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
