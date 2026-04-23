import type { Metadata } from "next";
import CommunityClient from "./CommunityClient";

export const metadata: Metadata = {
  title: "Сообщество",
  description: "Читайте фанфик-главы от других поклонников аниме, ставьте лайки и продолжайте любимые истории.",
  alternates: { canonical: "https://www.anicontinue.ru/community" },
  openGraph: {
    title: "Сообщество — AniContinue",
    description: "Читайте фанфик-главы от других поклонников аниме, ставьте лайки и продолжайте любимые истории.",
    url: "https://www.anicontinue.ru/community",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Сообщество AniContinue" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Сообщество — AniContinue",
    description: "Читайте фанфик-главы от других поклонников аниме, ставьте лайки и продолжайте любимые истории.",
    images: ["/og-image.svg"],
  },
};

export default function CommunityPage() {
  return <CommunityClient />;
}
