import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Поддержка проекта",
  description: "Добровольно поддержите AniContinue через Boosty и получите дополнительные генерации в подарок.",
};

export default function PricingPage() {
  return <PricingClient />;
}
