// Вызывается после client-side exchangeCodeForSession.
// Проверяет наличие профиля, создаёт его для новых пользователей,
// проверяет флаг registration_enabled.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Профиль уже есть — ничего делать не нужно.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (profile) {
    return NextResponse.json({ success: true });
  }

  // Новый пользователь — проверяем разрешена ли регистрация.
  const settings = await getSiteSettings();

  if (!settings.registration_enabled) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "registration_closed", redirectTo: "/auth/registration-closed" },
      { status: 403 }
    );
  }

  // Создаём профиль — пробуем взять имя из OAuth metadata.
  const rawName =
    user.user_metadata.full_name || user.email?.split("@")[0] || "";
  const cleaned = rawName
    .replace(/[^A-Za-z0-9_\-. а-яА-ЯёЁ]/g, "")
    .trim()
    .slice(0, 32);
  const baseName = cleaned.length >= 2 ? cleaned : null;

  // До 5 попыток с суффиксом при конфликте username.
  const candidates = baseName
    ? [
        baseName,
        ...Array.from(
          { length: 4 },
          () => `${baseName}${Math.floor(Math.random() * 10000)}`.slice(0, 32)
        ),
      ]
    : [];

  let created = false;
  for (const cand of candidates) {
    const { error: insertErr } = await supabase.from("profiles").insert([
      {
        id: user.id,
        username: cand,
        plan: "free",
        chapters_used: 0,
        chapters_limit: settings.default_chapters_limit,
      },
    ]);
    if (!insertErr) {
      created = true;
      break;
    }
    if (insertErr.code !== "23505" && insertErr.code !== "22023") {
      console.error("profile insert error:", insertErr);
      break;
    }
  }

  if (!created) {
    // Фолбэк: профиль без username, пользователь выберет имя через /settings.
    await supabase.from("profiles").insert([
      {
        id: user.id,
        username: null,
        plan: "free",
        chapters_used: 0,
        chapters_limit: settings.default_chapters_limit,
      },
    ]);
  }

  return NextResponse.json({ success: true });
}
