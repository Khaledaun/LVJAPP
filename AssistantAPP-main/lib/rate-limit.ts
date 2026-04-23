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
