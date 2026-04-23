import { withAuth } from 'next-auth/middleware'
import { NextResponse, type NextRequest, type NextMiddleware } from 'next/server'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n'
import { applyCsrf } from '@/lib/csrf'
import { applyRateLimit } from '@/lib/rate-limit'

const SKIP =
  process.env.SKIP_AUTH === '1' ||
  process.env.NEXT_PUBLIC_SKIP_AUTH === '1'

// Sprint 0.7 · D-015 · D-019 — locale detection on every matched request.
// Sets the `lvj_locale` cookie when:
//   1. an explicit /ar/* or /en/* or /pt/* path segment is present, OR
//   2. the cookie is absent and the Accept-Language header carries a
//      supported locale.
// API paths (/api/*) skip the locale rewrite — the JSON contract is
// locale-neutral and agents receive locale via their input envelope.
function applyLocaleCookie(req: NextRequest, res: NextResponse): NextResponse {
  if (req.nextUrl.pathname.startsWith('/api/')) return res

  const cookieValue = req.cookies.get(LOCALE_COOKIE)?.value
  const locale = resolveLocale({
    pathname: req.nextUrl.pathname,
    cookieValue,
    acceptLanguage: req.headers.get('accept-language'),
  })

  if (cookieValue !== locale) {
    res.cookies.set({
      name: LOCALE_COOKIE,
      value: locale,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }
  return res
}

const authedMiddleware = withAuth({
  pages: { signIn: '/signin' },
})

export default async function middleware(req: NextRequest, ev: any) {
  const pathname = req.nextUrl.pathname

  // API surface: CSRF guard only (staged rollout via CSRF_MODE env —
  // off | report-only | enforce). `withAuth` is *not* applied to
  // `/api/*` — API routes return 401 JSON themselves through
  // `runAuthed`; redirecting to `/signin` would break clients.
  if (pathname.startsWith('/api/')) {
    const csrfBlocked = applyCsrf(req)
    if (csrfBlocked) return csrfBlocked
    const rlBlocked = applyRateLimit(req)
    if (rlBlocked) return rlBlocked
    return NextResponse.next()
  }

  // Page surface: existing withAuth + locale cookie flow.
  const res = SKIP
    ? NextResponse.next()
    : (await Promise.resolve((authedMiddleware as any)(req, ev))) as NextResponse | undefined
  return applyLocaleCookie(req, res instanceof NextResponse ? res : NextResponse.next())
}

export const config = {
  matcher: [
    '/',
    '/cases/:path*',
    '/profile',
    '/settings',
    '/admin/:path*',
    // Locale-prefixed routes — match so the cookie gets set on first hit
    // even before the route group exists.
    '/ar/:path*',
    '/en/:path*',
    '/pt/:path*',
    // CSRF guard for every API route. NextAuth / webhooks / cron
    // self-skip via the lib/csrf skip list.
    '/api/:path*',
  ],
}
