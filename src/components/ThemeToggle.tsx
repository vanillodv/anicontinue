"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Пустой placeholder до гидратации — чтобы не было layout shift
  if (!mounted) {
    return (
      <div className="w-9 h-9 shrink-0" aria-hidden="true" />
    );
  }

  const isDark = theme === "dark" || theme === "system";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="ac-icon-btn shrink-0"
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
