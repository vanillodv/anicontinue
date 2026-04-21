import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Вход",
  description: "Войдите или зарегистрируйтесь в AniContinue — первые 3 главы бесплатно, без карты.",
};

export default function LoginPage() {
  return <LoginClient />;
}
