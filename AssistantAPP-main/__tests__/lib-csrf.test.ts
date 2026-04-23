/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { assertCsrf, classifyCsrf, applyCsrf, csrfMode } from '@/lib/csrf'

function mkReq(opts: {
  method?: string
  url?: string
  origin?: string | null
  referer?: string | null
  contentType?: string
}): Request {
  const headers: Record<string, string> = {}
  if (opts.origin !== null && opts.origin !== undefined) headers['origin'] = opts.origin
  if (opts.referer !== null && opts.referer !== undefined) headers['referer'] = opts.referer
  if (opts.contentType) headers['content-type'] = opts.contentType
  return new Request(opts.url ?? 'https://lvj.app/api/cases', {
    method: opts.method ?? 'POST',
    headers,
    body: opts.method && opts.method !== 'GET' ? JSON.stringify({ x: 1 }) : undefined,
  })
}

describe('lib/csrf · assertCsrf / classifyCsrf', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    delete process.env.SKIP_AUTH
    delete process.env.SKIP_DB
    process.env.NODE_ENV = 'production'
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('passes safe methods (GET / HEAD / OPTIONS)', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(classifyCsrf(mkReq({ method }))).toBe('skip_safe_method')
      expect(assertCsrf(mkReq({ method }))).toBeNull()
    }
  })

  it('passes a same-origin POST with Origin header', () => {
    const req = mkReq({ origin: 'https://lvj.app' })
    expect(classifyCsrf(req)).toBe('ok')
    expect(assertCsrf(req)).toBeNull()
  })

  it('blocks cross-origin POST even when Origin is present', async () => {
    const req = mkReq({ origin: 'https://evil.example.com' })
    expect(classifyCsrf(req)).toBe('fail_origin_mismatch')
    const res = assertCsrf(req)
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
    const body = await res!.json()
    expect(body.error).toBe('csrf_origin_mismatch')
  })

  it('does NOT exempt JSON POST — no content-type exemption (the whole point)', () => {
    // Same Origin: still CSRF-checked, passes because origin matches.
    const ok = mkReq({ origin: 'https://lvj.app', contentType: 'application/json' })
    expect(classifyCsrf(ok)).toBe('ok')

    // Cross-origin JSON POST: still rejected. This is the contract — a
    // "JSON is safe" exemption would let `fetch('https://lvj.app/...',
    // { method: 'POST', headers: { 'content-type': 'application/json' }})`
    // from evil.example.com succeed, which it must not.
    const bad = mkReq({ origin: 'https://evil.example.com', contentType: 'application/json' })
    expect(classifyCsrf(bad)).toBe('fail_origin_mismatch')
  })

  it('falls back to Referer origin when Origin is absent', () => {
    const ok = mkReq({ origin: null, referer: 'https://lvj.app/cases' })
    expect(classifyCsrf(ok)).toBe('ok')

    const bad = mkReq({ origin: null, referer: 'https://evil.example.com/x' })
    expect(classifyCsrf(bad)).toBe('fail_referer_mismatch')
  })

  it('blocks a POST with neither Origin nor Referer', () => {
    const req = mkReq({ origin: null, referer: null })
    expect(classifyCsrf(req)).toBe('fail_no_origin')
    const res = assertCsrf(req)
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
  })

  it('skips NextAuth, webhook, and cron paths — their own auth layer takes over', () => {
    const nextauth = mkReq({ url: 'https://lvj.app/api/auth/session', origin: null, referer: null })
    expect(classifyCsrf(nextauth)).toBe('skip_path')

    const webhook = mkReq({ url: 'https://lvj.app/api/webhooks/webflow', origin: null, referer: null })
    expect(classifyCsrf(webhook)).toBe('skip_path')

    const cron = mkReq({ url: 'https://lvj.app/api/cron/audit-tenant-nightly', origin: null, referer: null })
    expect(classifyCsrf(cron)).toBe('skip_path')
  })

  it('respects SKIP_AUTH=1 for dev / CI loops', () => {
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    // Would normally be fail_origin_mismatch, but skipped in dev.
    const req = mkReq({ origin: 'https://evil.example.com' })
    expect(classifyCsrf(req)).toBe('skip_dev')
    expect(assertCsrf(req)).toBeNull()
  })

  it('SKIP_AUTH is ignored in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.SKIP_AUTH = '1'
    const req = mkReq({ origin: 'https://evil.example.com' })
    expect(classifyCsrf(req)).toBe('fail_origin_mismatch')
  })

  it('accepts an explicit expectedOrigin override (for reverse proxies)', () => {
    const req = mkReq({ url: 'http://internal:3000/api/cases', origin: 'https://lvj.app' })
    expect(classifyCsrf(req)).toBe('fail_origin_mismatch')
    expect(classifyCsrf(req, { expectedOrigin: 'https://lvj.app' })).toBe('ok')
  })
})

describe('lib/csrf · csrfMode + applyCsrf (middleware entry)', () => {
  const origEnv = { ...process.env }
  let warnSpy: ReturnType<typeof jest.spyOn>
  beforeEach(() => {
    delete process.env.SKIP_AUTH
    delete process.env.SKIP_DB
    delete process.env.CSRF_MODE
    process.env.NODE_ENV = 'production'
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    process.env = { ...origEnv }
    warnSpy.mockRestore()
  })

  it('csrfMode defaults to `off`', () => {
    expect(csrfMode()).toBe('off')
  })

  it('csrfMode reads `enforce` / `report-only` / `report_only` / `report`', () => {
    process.env.CSRF_MODE = 'enforce'
    expect(csrfMode()).toBe('enforce')
    process.env.CSRF_MODE = 'report-only'
    expect(csrfMode()).toBe('report-only')
    process.env.CSRF_MODE = 'report_only'
    expect(csrfMode()).toBe('report-only')
    process.env.CSRF_MODE = 'report'
    expect(csrfMode()).toBe('report-only')
    process.env.CSRF_MODE = 'nonsense'
    expect(csrfMode()).toBe('off')
  })

  it('applyCsrf returns null when mode=off, even for a failing request', () => {
    const req = mkReq({ origin: 'https://evil.example.com' })
    expect(applyCsrf(req)).toBeNull()
  })

  it('applyCsrf warns but does not block in report-only mode', () => {
    process.env.CSRF_MODE = 'report-only'
    const req = mkReq({ origin: 'https://evil.example.com' })
    expect(applyCsrf(req)).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = String(warnSpy.mock.calls[0][0])
    expect(msg).toContain('[csrf] report-only')
    expect(msg).toContain('fail_origin_mismatch')
  })

  it('applyCsrf returns a 403 Response in enforce mode', async () => {
    process.env.CSRF_MODE = 'enforce'
    const req = mkReq({ origin: 'https://evil.example.com' })
    const res = applyCsrf(req)
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
    const body = await res!.json()
    expect(body.error).toBe('csrf_origin_mismatch')
  })

  it('applyCsrf lets same-origin through in enforce mode without warning', () => {
    process.env.CSRF_MODE = 'enforce'
    const req = mkReq({ origin: 'https://lvj.app' })
    expect(applyCsrf(req)).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
