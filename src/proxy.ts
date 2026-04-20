import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Refresh session for all routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // This refreshes the session token in cookies
  const { data: { user } } = await supabase.auth.getUser();

  // Admin guard — второй рубеж поверх requireAdmin()/requireAdminPage().
  // Защищает от забытых проверок в отдельных роутах/страницах.
  const path = req.nextUrl.pathname;
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/api/admin');
  if (isAdminPath) {
    const isApi = path.startsWith('/api/admin');
    if (!user) {
      return isApi
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', req.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return isApi
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Rate limit on /api/generate
  if (req.nextUrl.pathname.startsWith('/api/generate')) {
    const ip = (req as any).ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (entry && now < entry.resetAt) {
      if (entry.count >= 3) {
        return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
