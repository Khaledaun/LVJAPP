/**
 * @jest-environment node
 *
 * Unit tests for the HITL SLA sweep cron handler (D-013 tiers).
 * Uses SKIP_DB=1 to keep the test off the real DB; when DB is
 * reachable the handler imports `expireStale` from
 * `lib/agents/hitl.ts` dynamically (not evaluated in this test).
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { GET } from '@/app/api/cron/hitl-sla-sweep/route'

function mkReq(auth?: string): Request {
  const headers: Record<string, string> = {}
  if (auth !== undefined) headers['authorization'] = auth
  return new Request('http://localhost/api/cron/hitl-sla-sweep', { headers })
}

describe('app/api/cron/hitl-sla-sweep · runCron + SKIP_DB short-circuit', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    process.env = { ...origEnv }
    // SKIP_AUTH short-circuits runCron's bearer check; SKIP_DB keeps
    // us off the real expireStale path.
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    process.env.SKIP_DB = '1'
    delete process.env.CRON_SECRET
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns 200 { ok: true, expired: 0, skipped: "SKIP_DB" } when SKIP_DB=1', async () => {
    const res = await GET(mkReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(
      expect.objectContaining({
        id: 'hitl.sla.sweep',
        ok: true,
        expired: 0,
        skipped: 'SKIP_DB',
        correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        path: '/api/cron/hitl-sla-sweep',
      }),
    )
  })

  it('401 on missing bearer in prod (runCron contract)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SKIP_AUTH = ''
    process.env.SKIP_DB = ''
    process.env.CRON_SECRET = 'correct-horse-battery-staple'
    const res = await GET(mkReq())
    expect(res.status).toBe(401)
  })

  it('stamps X-Correlation-Id on success', async () => {
    const res = await GET(mkReq())
    expect(res.headers.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('declares force-dynamic + revalidate=0 (A-005)', async () => {
    const mod = await import('@/app/api/cron/hitl-sla-sweep/route')
    expect((mod as any).dynamic).toBe('force-dynamic')
    expect((mod as any).revalidate).toBe(0)
  })
})
