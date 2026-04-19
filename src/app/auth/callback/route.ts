import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Use the actual host the browser connected to (works for LAN IP access too)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'http');
  const origin = `${proto}://${host}`;

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error exchangeCodeForSession:', error.message)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    // Создаем профиль если его нет
    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert([
          { 
            id: data.user.id, 
            username: data.user.user_metadata.full_name || data.user.email?.split('@')[0],
            plan: 'free',
            chapters_used: 0,
            chapters_limit: 3
          }
        ])
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
