/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { GET } from '@/app/api/cron/audit-auth-weekly/route'

function mkReq(auth?: string): Request {
  const headers: Record<string, string> = {}
  if (auth !== undefined) headers['authorization'] = auth
  return new Request('http://localhost/api/cron/audit-auth-weekly', { headers })
}

describe('app/api/cron/audit-auth-weekly · runCron + runAuditAuth', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    delete process.env.SKIP_AUTH
    delete process.env.SKIP_DB
    delete process.env.CRON_SECRET
    process.env.NODE_ENV = 'production'
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns 401 when the bearer token is missing (runCron contract)', async () => {
    process.env.CRON_SECRET = 'cron-bearer'
    const res = await GET(mkReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 when the bearer token mismatches', async () => {
    process.env.CRON_SECRET = 'cron-bearer'
    const res = await GET(mkReq('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('runs the audit and returns a clean summary on success', async () => {
    process.env.CRON_SECRET = 'cron-bearer'
    const res = await GET(mkReq('Bearer cron-bearer'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('a002')
    expect(body.ok).toBe(true)
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.path).toBe('/api/cron/audit-auth-weekly')
    expect(typeof body.total).toBe('number')
    expect(body.counts).toEqual(
      expect.objectContaining({
        guarded: expect.any(Number),
        intentionalPublic: expect.any(Number),
        stub: expect.any(Number),
        unauthed: expect.any(Number),
      }),
    )
    expect(Array.isArray(body.violations)).toBe(true)
    // Current branch: 0 unauthed (the audit gate is green).
    expect(body.counts.unauthed).toBe(0)
    expect(body.violations).toHaveLength(0)
  })

  it('stamps X-Correlation-Id even on the auth path', async () => {
    process.env.CRON_SECRET = 'cron-bearer'
    const res = await GET(mkReq('Bearer cron-bearer'))
    expect(res.headers.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('bypasses the bearer check under SKIP_AUTH=1 in dev', async () => {
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    // No CRON_SECRET, no bearer — runs anyway in dev.
    const res = await GET(mkReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('a002')
  })
})
