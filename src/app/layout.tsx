import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/layout/CookieBanner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0D0D1A] text-white">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}

