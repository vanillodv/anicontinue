import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Настройки",
  description: "Управление профилем: имя пользователя, экспорт данных, удаление аккаунта.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
