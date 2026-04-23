/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  clientKey,
  checkRateLimit,
  __resetRateLimitCounters,
  applyRateLimit,
  rateLimitMode,
} from '@/lib/rate-limit'

function mkReq(headers: Record<string, string>): Request {
  return new Request('https://lvj.app/api/x', { headers })
}

describe('lib/rate-limit · clientKey', () => {
  it('prefers userId when provided', () => {
    expect(clientKey(mkReq({}), 'user_abc')).toBe('user:user_abc')
    expect(clientKey(mkReq({ 'x-real-ip': '1.2.3.4' }), 'user_abc')).toBe('user:user_abc')
  })

  it('falls back to x-real-ip when userId absent', () => {
    expect(clientKey(mkReq({ 'x-real-ip': '1.2.3.4' }))).toBe('ip:1.2.3.4')
  })

  it('takes the RIGHTMOST entry of X-Forwarded-For (the trusted proxy)', () => {
    // Leftmost is client-controlled and spoofable. Rightmost is the
    // last proxy (the one talking to our origin). The verification the
    // post-0.7 cleanup list asked for.
    const req = mkReq({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' })
    expect(clientKey(req)).toBe('ip:3.3.3.3')
  })

  it('handles a single-entry X-Forwarded-For', () => {
    expect(clientKey(mkReq({ 'x-forwarded-for': '9.9.9.9' }))).toBe('ip:9.9.9.9')
  })

  it('trims whitespace around XFF entries', () => {
    const req = mkReq({ 'x-forwarded-for': '  1.1.1.1  ,  2.2.2.2  ' })
    expect(clientKey(req)).toBe('ip:2.2.2.2')
  })

  it('prefers x-real-ip over X-Forwarded-For when both are present', () => {
    const req = mkReq({
      'x-real-ip': '10.0.0.1',
      'x-forwarded-for': '1.1.1.1, 2.2.2.2',
    })
    expect(clientKey(req)).toBe('ip:10.0.0.1')
  })

  it('returns `ip:unknown` when nothing usable is available', () => {
    expect(clientKey(mkReq({}))).toBe('ip:unknown')
    expect(clientKey(mkReq({ 'x-forwarded-for': '' }))).toBe('ip:unknown')
    expect(clientKey(mkReq({ 'x-forwarded-for': ', ,' }))).toBe('ip:unknown')
  })
})

describe('lib/rate-limit · checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimitCounters()
  })

  it('allows up to the limit, then rejects', () => {
    const opts = { limit: 3, windowMs: 60_000 }
    const r1 = checkRateLimit('k1', opts)
    const r2 = checkRateLimit('k1', opts)
    const r3 = checkRateLimit('k1', opts)
    const r4 = checkRateLimit('k1', opts)
    expect(r1.ok).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r2.remaining).toBe(1)
    expect(r3.remaining).toBe(0)
    expect(r4.ok).toBe(false)
    expect(r4.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets the counter after the window expires', () => {
    let fakeNow = 1_000_000
    const opts = { limit: 2, windowMs: 1_000, now: () => fakeNow }
    expect(checkRateLimit('k2', opts).ok).toBe(true)
    expect(checkRateLimit('k2', opts).ok).toBe(true)
    expect(checkRateLimit('k2', opts).ok).toBe(false)
    fakeNow += 2_000
    const after = checkRateLimit('k2', opts)
    expect(after.ok).toBe(true)
    expect(after.remaining).toBe(1)
  })

  it('buckets different keys independently', () => {
    const opts = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit('a', opts).ok).toBe(true)
    expect(checkRateLimit('b', opts).ok).toBe(true)
    expect(checkRateLimit('a', opts).ok).toBe(false)
    expect(checkRateLimit('b', opts).ok).toBe(false)
  })

  it('retryAfterMs points at the window reset', () => {
    let fakeNow = 0
    const opts = { limit: 1, windowMs: 5_000, now: () => fakeNow }
    checkRateLimit('k3', opts)
    fakeNow = 1_000
    const blocked = checkRateLimit('k3', opts)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterMs).toBe(4_000)
  })
})

describe('lib/rate-limit · rateLimitMode + applyRateLimit (middleware entry)', () => {
  const origEnv = { ...process.env }
  let warnSpy: ReturnType<typeof jest.spyOn>

  function mkApiReq(url = 'https://lvj.app/api/cases', headers: Record<string, string> = {}, method = 'GET'): Request {
    return new Request(url, { method, headers })
  }

  beforeEach(() => {
    delete process.env.SKIP_AUTH
    delete process.env.SKIP_DB
    delete process.env.RATE_LIMIT_MODE
    process.env.NODE_ENV = 'production'
    __resetRateLimitCounters()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    process.env = { ...origEnv }
    warnSpy.mockRestore()
  })

  it('rateLimitMode defaults to `off`', () => {
    expect(rateLimitMode()).toBe('off')
  })

  it('applyRateLimit is a no-op when mode=off even over the limit', () => {
    for (let i = 0; i < 500; i++) {
      expect(applyRateLimit(mkApiReq('https://lvj.app/api/cases', { 'x-real-ip': '1.2.3.4' }))).toBeNull()
    }
  })

  it('applyRateLimit enforces the default 120/60s in enforce mode', async () => {
    process.env.RATE_LIMIT_MODE = 'enforce'
    const req = () => mkApiReq('https://lvj.app/api/cases', { 'x-real-ip': '5.5.5.5' })
    for (let i = 0; i < 120; i++) {
      expect(applyRateLimit(req())).toBeNull()
    }
    const blocked = applyRateLimit(req())
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('retry-after')).toBeTruthy()
    const body = await blocked!.json()
    expect(body.error).toBe('rate_limited')
    expect(body.retryAfterSec).toBeGreaterThanOrEqual(1)
  })

  it('applyRateLimit in report-only warns but lets the request through', () => {
    process.env.RATE_LIMIT_MODE = 'report-only'
    const req = () => mkApiReq('https://lvj.app/api/cases', { 'x-real-ip': '6.6.6.6' })
    for (let i = 0; i < 120; i++) applyRateLimit(req())
    // 121st call — would block in enforce mode.
    const res = applyRateLimit(req())
    expect(res).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    const msg = String(warnSpy.mock.calls[0][0])
    expect(msg).toContain('[rate-limit] report-only')
  })

  it('skips /api/cron/*, /api/auth/*, /api/webhooks/*, /api/health', () => {
    process.env.RATE_LIMIT_MODE = 'enforce'
    // Hammer each skip path past the default limit — should never block.
    const paths = [
      'https://lvj.app/api/cron/audit-tenant-nightly',
      'https://lvj.app/api/auth/session',
      'https://lvj.app/api/webhooks/webflow',
      'https://lvj.app/api/health',
    ]
    for (const url of paths) {
      for (let i = 0; i < 200; i++) {
        const res = applyRateLimit(mkApiReq(url, { 'x-real-ip': '7.7.7.7' }))
        expect(res).toBeNull()
      }
    }
  })

  it('skips non-API paths entirely (defensive — middleware shouldn\'t even call us there)', () => {
    process.env.RATE_LIMIT_MODE = 'enforce'
    for (let i = 0; i < 500; i++) {
      const res = applyRateLimit(mkApiReq('https://lvj.app/cases', { 'x-real-ip': '8.8.8.8' }))
      expect(res).toBeNull()
    }
  })

  it('buckets per (method, path, key) — same key on a different path does not share quota', () => {
    process.env.RATE_LIMIT_MODE = 'enforce'
    const opts = { limit: 2, windowMs: 60_000 }
    const reqA = () => mkApiReq('https://lvj.app/api/a', { 'x-real-ip': '9.9.9.9' })
    const reqB = () => mkApiReq('https://lvj.app/api/b', { 'x-real-ip': '9.9.9.9' })
    // Exhaust /api/a.
    expect(applyRateLimit(reqA(), opts)).toBeNull()
    expect(applyRateLimit(reqA(), opts)).toBeNull()
    const blockedA = applyRateLimit(reqA(), opts)
    expect(blockedA).not.toBeNull()
    // /api/b still has its own budget.
    expect(applyRateLimit(reqB(), opts)).toBeNull()
    expect(applyRateLimit(reqB(), opts)).toBeNull()
  })

  it('skips in dev with SKIP_AUTH=1', () => {
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    process.env.RATE_LIMIT_MODE = 'enforce'
    const opts = { limit: 1, windowMs: 60_000 }
    for (let i = 0; i < 10; i++) {
      expect(applyRateLimit(mkApiReq(), opts)).toBeNull()
    }
  })
})
