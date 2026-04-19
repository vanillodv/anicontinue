import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/layout/CookieBanner";
import { getSiteSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import MaintenancePage from "./maintenance/page";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "AniContinue", template: "%s | AniContinue" },
  description: "Создавай новые главы и сюжетные повороты для популярных аниме с помощью искусственного интеллекта.",
  keywords: ["аниме", "фанфик", "AI", "продолжение аниме", "AniContinue"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "AniContinue",
    title: "AniContinue — Продолжи своё любимое аниме с AI",
    description: "Создавай новые главы и сюжетные повороты для популярных аниме с помощью искусственного интеллекта.",
  },
  twitter: { card: "summary_large_image" },
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

  // Проверяем является ли юзер админом (для обхода maintenance)
  let isAdmin = false;
  if (settings.maintenance_mode) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = ['admin', 'super_admin'].includes(profile?.role ?? '');
    }
  }

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0D0D1A] text-white">
        {settings.maintenance_mode && !isAdmin ? (
          <MaintenancePage />
        ) : (
          <>
            <Header />
            {/* Объявление */}
            {settings.site_notice && (
              <div className="bg-[#E8409A]/10 border-b border-[#E8409A]/20 text-center py-2 px-4 text-sm text-[#E8409A]">
                {settings.site_notice}
              </div>
            )}
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <CookieBanner />
          </>
        )}
      </body>
    </html>
  );
}
