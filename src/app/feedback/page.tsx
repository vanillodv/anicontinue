import type { Metadata } from "next";
import FeedbackClient from "./FeedbackClient";

export const metadata: Metadata = {
  title: "Пожелания сообщества",
  description: "Предлагай идеи для AniContinue и голосуй за чужие — самые популярные берём в работу.",
};

export default function FeedbackPage() {
  return <FeedbackClient />;
}
