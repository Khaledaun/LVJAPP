/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  clientKey,
  checkRateLimit,
  __resetRateLimitCounters,
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
