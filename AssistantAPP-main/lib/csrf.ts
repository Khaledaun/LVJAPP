/**
 * CSRF guard for state-changing API routes.
 *
 * Contract (from docs/xrepo/khaledaunsite/04-security-and-compliance.md
 * and SESSION_NOTES pass-2 item 9):
 *
 *   - Every POST / PUT / PATCH / DELETE enforces same-origin via the
 *     `Origin` header (preferred) or `Referer` origin (fallback when
 *     browsers strip Origin).
 *   - **No content-type exemption.** JSON POSTs are CSRF-checked too —
 *     the historical "`application/json` is safe because forms can't
 *     send it" is false since `fetch` happily sends cross-origin JSON.
 *   - Skip list: NextAuth internals, HMAC-signed webhooks, cron bearer
 *     handlers. Their own auth boundary is the CSRF defense; re-checking
 *     Origin here would just break them.
 *   - Safe methods (GET / HEAD / OPTIONS) pass through.
 *   - Disabled when `SKIP_AUTH=1` / `SKIP_DB=1` (dev loops, smoke tests).
 *
 * Wiring: `assertCsrf(req)` returns `null` on pass, or a 403 `Response`
 * on fail. Route handlers call it at the top of state-changing methods;
 * once every route is verified to carry Origin (tracked as a rolling
 * open item), it moves into `middleware.ts` under an
 * `/api/:path*` matcher so no handler has to remember.
 *
 * Usage:
 *
 *     import { assertCsrf } from '@/lib/csrf'
 *     export async function POST(req: Request) {
 *       const bad = assertCsrf(req)
 *       if (bad) return bad
 *       return runAuthed('staff', async () => { ... })
 *     }
 */

import { NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Path prefixes whose handlers authenticate via their own mechanism.
// Adding a path here means "the route owns its own CSRF story" —
// document why in the comment on the new entry.
const SKIP_PREFIXES = [
  '/api/auth/',       // NextAuth (CSRF token cookie + double-submit)
  '/api/webhooks/',   // HMAC-signed external callers
  '/api/cron/',       // CRON_SECRET bearer (lib/cron.ts)
]

function shouldSkipAuth(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.SKIP_AUTH === '1' || process.env.SKIP_DB === '1'
}

function originOf(raw: string | null): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

export interface CsrfOptions {
  /** Override the expected origin. Defaults to `req.url`'s origin. */
  expectedOrigin?: string
}

export function assertCsrf(req: Request, opts: CsrfOptions = {}): Response | null {
  if (shouldSkipAuth()) return null

  const method = req.method.toUpperCase()
  if (SAFE_METHODS.has(method)) return null

  const reqUrl = new URL(req.url)
  if (SKIP_PREFIXES.some((p) => reqUrl.pathname.startsWith(p))) return null

  const expected = opts.expectedOrigin ?? `${reqUrl.protocol}//${reqUrl.host}`

  const origin = originOf(req.headers.get('origin'))
  const referer = originOf(req.headers.get('referer'))

  // State-changing request with no Origin AND no Referer is a
  // fail — modern browsers always send at least one on
  // cross-origin fetches. (curl / server-to-server clients that
  // legitimately need this should use the webhook or cron path.)
  if (!origin && !referer) {
    return forbidden('csrf_no_origin')
  }

  // Origin is authoritative when present. Referer is a fallback for
  // browsers that strip Origin (older versions, certain privacy modes).
  if (origin && origin !== expected) {
    return forbidden('csrf_origin_mismatch')
  }
  if (!origin && referer && referer !== expected) {
    return forbidden('csrf_referer_mismatch')
  }

  return null
}

function forbidden(reason: string): Response {
  return NextResponse.json({ ok: false, error: reason }, { status: 403 })
}

/**
 * Exposed for tests — the same-origin check with the skip list applied.
 * Returns the classification so tests can assert on the specific reason
 * without brittle status-code parsing.
 */
export function classifyCsrf(req: Request, opts: CsrfOptions = {}):
  | 'ok'
  | 'skip_safe_method'
  | 'skip_path'
  | 'skip_dev'
  | 'fail_no_origin'
  | 'fail_origin_mismatch'
  | 'fail_referer_mismatch' {
  if (shouldSkipAuth()) return 'skip_dev'
  const method = req.method.toUpperCase()
  if (SAFE_METHODS.has(method)) return 'skip_safe_method'
  const reqUrl = new URL(req.url)
  if (SKIP_PREFIXES.some((p) => reqUrl.pathname.startsWith(p))) return 'skip_path'
  const expected = opts.expectedOrigin ?? `${reqUrl.protocol}//${reqUrl.host}`
  const origin = originOf(req.headers.get('origin'))
  const referer = originOf(req.headers.get('referer'))
  if (!origin && !referer) return 'fail_no_origin'
  if (origin && origin !== expected) return 'fail_origin_mismatch'
  if (!origin && referer && referer !== expected) return 'fail_referer_mismatch'
  return 'ok'
}
