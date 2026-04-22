import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSiteSettings } from '@/lib/settings'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth error exchangeCodeForSession:', error.message)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    if (data?.user) {
      // Проверяем есть ли профиль
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // Новый пользователь — проверяем разрешена ли регистрация
        const settings = await getSiteSettings()

        if (!settings.registration_enabled) {
          // Регистрация закрыта — выходим и редиректим на страницу ошибки
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/auth/registration-closed`)
        }

        // Пытаемся взять имя из OAuth, нормализуем под валидатор в БД
        // (A-Za-z0-9_\-. кириллица пробел, 2..32).
        const rawName = data.user.user_metadata.full_name || data.user.email?.split('@')[0] || '';
        const cleaned = rawName
          .replace(/[^A-Za-z0-9_\-. а-яА-ЯёЁ]/g, '')
          .trim()
          .slice(0, 32);
        const baseName = cleaned.length >= 2 ? cleaned : null;

        // Пробуем ряд суффиксов до 5 попыток; если всё занято — записываем username=null,
        // юзер выберет имя сам через /api/user/username.
        let finalUsername: string | null = null;
        const candidates = baseName
          ? [baseName, ...Array.from({ length: 4 }, () => `${baseName}${Math.floor(Math.random() * 10000)}`.slice(0, 32))]
          : [];

        for (const cand of candidates) {
          const { error: insertErr } = await supabase.from('profiles').insert([{
            id: data.user.id,
            username: cand,
            plan: 'free',
            chapters_used: 0,
            chapters_limit: settings.default_chapters_limit,
          }]);
          if (!insertErr) { finalUsername = cand; break; }
          // 23505 = unique_violation, 22023 = reserved/bad username
          if (insertErr.code !== '23505' && insertErr.code !== '22023') {
            console.error('profile insert error:', insertErr);
            break;
          }
        }

        if (!finalUsername) {
          // Фолбэк: профиль без имени. Юзер проставит его сам.
          await supabase.from('profiles').insert([{
            id: data.user.id,
            username: null,
            plan: 'free',
            chapters_used: 0,
            chapters_limit: settings.default_chapters_limit,
          }]);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
