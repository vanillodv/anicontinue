import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Поддержка проекта",
  description: "Добровольно поддержите AniContinue через Boosty и получите дополнительные генерации в подарок.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Поддержка проекта · AniContinue",
    description: "Добровольно поддержите AniContinue через Boosty и получите дополнительные генерации в подарок.",
    url: "https://www.anicontinue.ru/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
