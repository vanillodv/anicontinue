import type { Metadata } from "next";
import CommunityClient from "./CommunityClient";

export const metadata: Metadata = {
  title: "Сообщество",
  description: "Читайте фанфик-главы от других поклонников аниме, ставьте лайки и продолжайте любимые истории.",
};

export default function CommunityPage() {
  return <CommunityClient />;
}
