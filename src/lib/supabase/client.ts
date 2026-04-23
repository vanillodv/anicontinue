import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // detectSessionInUrl: false — обмен кода делаем вручную в /auth/callback/page.tsx.
  // Автоматический обмен при инициализации клиента (дефолт: true) приводит к двойному
  // использованию кода: Header/другие компоненты используют код первыми,
  // наш useEffect падает с "code already used" → пользователь видит страницу ошибки.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { detectSessionInUrl: false } }
  )
}
