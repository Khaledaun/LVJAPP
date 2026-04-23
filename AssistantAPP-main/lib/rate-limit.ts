/**
 * Rate-limit helpers.
 *
 * Contract (from docs/xrepo/khaledaunsite/04-security-and-compliance.md):
 *
 *   - **Key** by user id when known, else by IP. IP extraction
 *     prefers `x-real-ip`; falls back to the **rightmost** entry in
 *     `X-Forwarded-For`. The rightmost entry matters: the leftmost
 *     is client-controlled (anyone can spoof it), the rightmost is
 *     the last proxy (typically Vercel / the load balancer) talking
 *     to your origin and is the bucket you actually want.
 *   - **Storage**: in-memory Map in dev / CI (this module). Upstash
 *     Redis in prod via `@upstash/ratelimit` — wired in when that
 *     PR lands; `checkRateLimit` is the same signature so callers
 *     don't change.
 *   - **Algorithm**: fixed-window counter, simplest viable for a
 *     single-instance dev server. Not correct across Edge instances;
 *     that's why prod needs Upstash.
 *
 * Usage:
 *
 *     import { clientKey, checkRateLimit } from '@/lib/rate-limit'
 *     const key = clientKey(req, user?.id)
 *     const rl = checkRateLimit(`api:POST:/cases:${key}`, { limit: 20, windowMs: 60_000 })
 *     if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, {
 *       status: 429,
 *       headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
 *     })
 */

const counters = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
  /** Injected clock for tests. Default: `Date.now`. */
  now?: () => number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterMs: number
  resetAt: number
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = (opts.now ?? Date.now)()
  const existing = counters.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    counters.set(key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, retryAfterMs: 0, resetAt }
  }
  existing.count += 1
  if (existing.count > opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
      resetAt: existing.resetAt,
    }
  }
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    retryAfterMs: 0,
    resetAt: existing.resetAt,
  }
}

/** Test-only hook: drop all counters between test cases. */
export function __resetRateLimitCounters(): void {
  counters.clear()
}

// ─────────────────────────────────────────────────────────────
// Middleware-facing dispatcher.
//
// `RATE_LIMIT_MODE` drives staged rollout, matching the CSRF pattern:
//   - `off` (default)   — no-op.
//   - `report-only`     — count + console.warn on breach, pass through.
//   - `enforce`         — count + 429 `Retry-After` on breach.
//
// Skip prefixes (no limiter):
//   - `/api/auth/*`     — NextAuth owns its own throttling.
//   - `/api/webhooks/*` — external callers already rate-limited
//                         upstream; HMAC verifies they're real.
//   - `/api/cron/*`     — Vercel Cron schedules, not a flood source.
//   - `/api/health`     — uptime probes must never get 429.
//
// `SKIP_AUTH=1` / `SKIP_DB=1` bypass in dev / CI.
//
// The in-memory Map is correct only within a single server instance.
// Edge middleware runs across multiple instances on Vercel, so prod
// rollout to `enforce` should wait for the Upstash backend — until
// then, `enforce` is a best-effort DoS shock absorber and
// `report-only` is the intended production mode.
// ─────────────────────────────────────────────────────────────

export type RateLimitMode = 'off' | 'report-only' | 'enforce'

const DEFAULT_LIMIT = 120
const DEFAULT_WINDOW_MS = 60_000

const SKIP_PREFIXES = [
  '/api/auth/',
  '/api/webhooks/',
  '/api/cron/',
]
const SKIP_EXACT = new Set(['/api/health'])

export function rateLimitMode(): RateLimitMode {
  const raw = (process.env.RATE_LIMIT_MODE ?? '').toLowerCase().replace('_', '-')
  if (raw === 'enforce') return 'enforce'
  if (raw === 'report-only' || raw === 'report') return 'report-only'
  return 'off'
}

function shouldSkipAuth(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.SKIP_AUTH === '1' || process.env.SKIP_DB === '1'
}

export interface ApplyRateLimitOptions {
  userId?: string | null
  limit?: number
  windowMs?: number
  now?: () => number
}

/**
 * Entry point used by `middleware.ts`. Returns a 429 `Response` to
 * short-circuit the request when `RATE_LIMIT_MODE=enforce` and the
 * caller is over quota; otherwise `null` (the request continues).
 */
export function applyRateLimit(req: Request, opts: ApplyRateLimitOptions = {}): Response | null {
  const mode = rateLimitMode()
  if (mode === 'off') return null
  if (shouldSkipAuth()) return null

  const url = new URL(req.url)
  if (!url.pathname.startsWith('/api/')) return null
  if (SKIP_EXACT.has(url.pathname)) return null
  if (SKIP_PREFIXES.some((p) => url.pathname.startsWith(p))) return null

  const limit = opts.limit ?? DEFAULT_LIMIT
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const key = `${req.method}:${url.pathname}:${clientKey(req, opts.userId)}`
  const result = checkRateLimit(key, { limit, windowMs, now: opts.now })
  if (result.ok) return null

  if (mode === 'report-only') {
    console.warn(
      `[rate-limit] report-only: would block ${req.method} ${url.pathname} · key=${key} · retryAfterMs=${result.retryAfterMs}`,
    )
    return null
  }

  const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000))
  return new Response(
    JSON.stringify({ ok: false, error: 'rate_limited', retryAfterSec }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(retryAfterSec),
      },
    },
  )
}

/**
 * Extract a stable rate-limit key from a request.
 *
 *   1. If `userId` is provided, return `user:${userId}`. Authed
 *      traffic is bucketed by identity — an abusive user can't
 *      rotate IPs to dodge their own limit.
 *   2. Else use `x-real-ip` if the platform sets it (Vercel does).
 *   3. Else take the **rightmost** non-empty entry of
 *      `X-Forwarded-For`. Rightmost = last proxy talking to us =
 *      the only entry we can trust.
 *   4. Else fall back to `'unknown'`. Callers should treat this
 *      as its own shared bucket; it shouldn't happen in prod.
 */
export function clientKey(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`

  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return `ip:${realIp}`

  const xff = req.headers.get('x-forwarded-for') ?? ''
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    const rightmost = parts[parts.length - 1]
    if (rightmost) return `ip:${rightmost}`
  }

  return 'ip:unknown'
}
