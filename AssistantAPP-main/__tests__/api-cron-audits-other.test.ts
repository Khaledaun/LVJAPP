/**
 * @jest-environment node
 *
 * Parity tests for the other three audit cron handlers (A-003,
 * A-004, A-011). The A-002 handler has its own exhaustive test
 * (`__tests__/api-cron-audit-auth.test.ts`) covering the full
 * `runCron` contract (401 paths, correlation id stamp, SKIP_AUTH
 * bypass). These tests focus on **payload shape** + the handler's
 * specific summary fields.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { GET as authNightly } from '@/app/api/cron/audit-auth-weekly/route'
import { GET as tenantNightly } from '@/app/api/cron/audit-tenant-nightly/route'
import { GET as jurisdictionWeekly } from '@/app/api/cron/audit-jurisdiction-weekly/route'
import { GET as kbWeekly } from '@/app/api/cron/audit-kb-staleness-weekly/route'

function mkReq(path: string, auth?: string): Request {
  const headers: Record<string, string> = {}
  if (auth !== undefined) headers['authorization'] = auth
  return new Request(`http://localhost${path}`, { headers })
}

describe('cron audit handlers · parity', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    process.env = { ...origEnv }
    // Dev bypass so runCron doesn't require CRON_SECRET.
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    delete process.env.CRON_SECRET
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('A-002 audit-auth-weekly · carries the summary + issues fields', async () => {
    const res = await authNightly(mkReq('/api/cron/audit-auth-weekly'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('a002')
    expect(body.path).toBe('/api/cron/audit-auth-weekly')
    expect(body.ok).toBe(true)
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.counts).toEqual(
      expect.objectContaining({
        guarded: expect.any(Number),
        intentionalPublic: expect.any(Number),
        stub: expect.any(Number),
        unauthed: 0,
      }),
    )
    expect(body.violations).toEqual([])
    expect(body.issues).toEqual([])
  })

  it('A-003 audit-tenant-nightly · carries schema + route-violation fields', async () => {
    const res = await tenantNightly(mkReq('/api/cron/audit-tenant-nightly'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('a003')
    expect(body.ok).toBe(true)
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.schema).toEqual(
      expect.objectContaining({
        modelsWithTenantId: expect.any(Number),
        scopedInLib: expect.any(Number),
        nullableInLib: expect.any(Number),
        missingFromLib: expect.any(Array),
        extraInLib: expect.any(Array),
      }),
    )
    expect(typeof body.routesScanned).toBe('number')
    expect(Array.isArray(body.routeViolations)).toBe(true)
    expect(Array.isArray(body.schemaErrors)).toBe(true)
    // Current branch is tenant-clean.
    expect(body.schema.missingFromLib).toEqual([])
    expect(body.schema.extraInLib).toEqual([])
    expect(body.routeViolations).toEqual([])
  })

  it('A-004 audit-jurisdiction-weekly · informational, always ok:true, perTerm present', async () => {
    const res = await jurisdictionWeekly(mkReq('/api/cron/audit-jurisdiction-weekly'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('a004')
    expect(body.ok).toBe(true)
    expect(typeof body.totalFiles).toBe('number')
    expect(typeof body.totalHits).toBe('number')
    expect(typeof body.nonAllowlistedHits).toBe('number')
    expect(body.perTerm).toEqual(expect.any(Object))
    expect(Array.isArray(body.sampleNonAllowlisted)).toBe(true)
    expect(typeof body.truncated).toBe('boolean')
  })

  it('A-004 audit-jurisdiction-weekly · sampleNonAllowlisted is capped at 200 and truncated flag reflects it', async () => {
    const res = await jurisdictionWeekly(mkReq('/api/cron/audit-jurisdiction-weekly'))
    const body = await res.json()
    expect(body.sampleNonAllowlisted.length).toBeLessThanOrEqual(200)
    // If the cap is exactly hit or exceeded, truncated MUST be true.
    if (body.nonAllowlistedHits > 200) {
      expect(body.truncated).toBe(true)
      expect(body.sampleNonAllowlisted.length).toBe(200)
    } else {
      expect(body.truncated).toBe(false)
    }
  })

  it('A-011 audit-kb-staleness-weekly · informational, carries articles array + FRESH/STALE/EXPIRED/INVALID/LEGACY counts', async () => {
    const res = await kbWeekly(mkReq('/api/cron/audit-kb-staleness-weekly'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('a011')
    expect(body.ok).toBe(true)
    expect(body.now).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.counts).toEqual(
      expect.objectContaining({
        FRESH: expect.any(Number),
        STALE: expect.any(Number),
        EXPIRED: expect.any(Number),
        INVALID: expect.any(Number),
        LEGACY: expect.any(Number),
      }),
    )
    expect(typeof body.badCount).toBe('number')
    expect(Array.isArray(body.articles)).toBe(true)
    expect(body.articles.length).toBe(body.total)
    // Post-D-026 + SKILL.md migration: everything FRESH.
    expect(body.counts.STALE).toBe(0)
    expect(body.counts.EXPIRED).toBe(0)
    expect(body.counts.INVALID).toBe(0)
    expect(body.counts.LEGACY).toBe(0)
  })
})
