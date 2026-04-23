import type { Metadata } from "next";
import { Manrope, Playfair_Display, JetBrains_Mono, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/layout/CookieBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import MaintenancePage from "./maintenance/page";

// Основной sans: Manrope (поддержка кириллицы)
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Serif для заголовков: Playfair Display поддерживает italic и кириллицу.
// Имя CSS-переменной --font-fraunces оставлено для обратной совместимости.
const fraunces = Playfair_Display({
  variable: "--font-fraunces",
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

// Моноширинный для eyebrow/kicker
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Японский serif для кандзи-акцентов (печати, номера секций)
const notoJp = Noto_Serif_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.anicontinue.ru"),
  title: { default: "AniContinue — Продолжи своё любимое аниме с AI", template: "%s | AniContinue" },
  description: "Создавай новые главы и сюжетные повороты для популярных аниме с помощью искусственного интеллекта.",
  keywords: ["аниме", "фанфик", "AI", "продолжение аниме", "AniContinue"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "AniContinue",
    title: "AniContinue — Продолжи своё любимое аниме с AI",
    description: "Создавай новые главы и сюжетные повороты для популярных аниме с помощью искусственного интеллекта.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "AniContinue — фанфики нового поколения",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AniContinue — Продолжи своё любимое аниме с AI",
    description: "Создавай новые главы и сюжетные повороты для популярных аниме с помощью искусственного интеллекта.",
    images: ["/og-image.svg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, supabase] = await Promise.all([
    getSiteSettings(),
    createClient(),
  ]);

  // Один запрос сессии + роли на весь layout — передаём в Header как prop,
  // чтобы он не дёргал /api/user/me на каждой странице (это было ~1.4с).
  const { data: { user } } = await supabase.auth.getUser();
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role ?? null;
  }
  const isAdmin = ['admin', 'super_admin'].includes(role ?? '');

  const fontVars = `${manrope.variable} ${fraunces.variable} ${jetbrains.variable} ${notoJp.variable}`;

  return (
    <html lang="ru" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {settings.maintenance_mode && !isAdmin ? (
            <MaintenancePage />
          ) : (
            <>
              <Header initialUser={user} initialRole={role} />
              {settings.site_notice && (
                <div className="relative z-20 border-b border-[color:var(--line)] text-center py-2 px-4 text-sm"
                     style={{ background: "rgba(232,93,79,0.08)", color: "var(--cinnabar)" }}>
                  {settings.site_notice}
                </div>
              )}
              <main className="flex-grow relative z-10">
                {children}
              </main>
              <Footer />
              <CookieBanner />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
