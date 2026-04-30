import type { Metadata } from "next";
import CommunityClient from "./CommunityClient";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export const metadata: Metadata = {
  title: "Сообщество — фанфики по аниме от читателей",
  description:
    "Лента публичных фанфик-глав по любимым аниме. Романтика, экшн, альтернативные концовки от других читателей. Лайки, комментарии, сортировка по новизне и популярности.",
  keywords: [
    "сообщество аниме фанфиков",
    "читать фанфик аниме",
    "анимэ фанфики онлайн",
    "AniContinue сообщество",
  ],
  alternates: { canonical: "https://www.anicontinue.ru/community" },
  openGraph: {
    title: "Сообщество — фанфики по аниме от читателей",
    description:
      "Лента публичных фанфик-глав. Романтика, экшн, альтернативные концовки от других читателей.",
    url: "https://www.anicontinue.ru/community",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Сообщество AniContinue" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Сообщество — фанфики по аниме от читателей",
    description:
      "Лента публичных фанфик-глав. Романтика, экшн, альтернативные концовки.",
    images: ["/og-image.png"],
  },
};

const breadcrumbsLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.anicontinue.ru" },
    { "@type": "ListItem", position: 2, name: "Сообщество", item: "https://www.anicontinue.ru/community" },
  ],
};

export default function CommunityPage() {
  return (
    <>
      <JsonLd data={breadcrumbsLd} />
      <div style={{ padding: "32px 44px 0", maxWidth: 1400, margin: "0 auto" }}>
        <Breadcrumbs items={[{ label: "Сообщество" }]} />
      </div>
      <CommunityClient />
    </>
  );
}
