/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals'
import { runAuditChain, INTENTIONAL_NO_AUDIT } from '@/lib/audits/audit-chain'

describe('lib/audits/audit-chain · runAuditChain (A-013)', () => {
  it('walks app/api/ and returns the four-bucket classification', () => {
    const result = runAuditChain()
    expect(result.total).toBeGreaterThan(0)
    expect(Object.keys(result.grouped).sort()).toEqual([
      'AUDITED', 'INTENTIONAL_NO_AUDIT', 'MISSING_AUDIT', 'STUB',
    ])
    expect(result.rows.length).toBe(result.total)
    expect(
      result.rows.every((r) =>
        ['AUDITED', 'INTENTIONAL_NO_AUDIT', 'STUB', 'MISSING_AUDIT'].includes(r.classification),
      ),
    ).toBe(true)
  })

  it('classifies cron handlers as INTENTIONAL_NO_AUDIT (allowlisted)', () => {
    const result = runAuditChain()
    const cronRows = result.rows.filter((r) => r.path.startsWith('cron/'))
    for (const row of cronRows) {
      expect(row.classification).toBe('INTENTIONAL_NO_AUDIT')
    }
  })

  it('classifies a route with no mutating methods as AUDITED (trivially — nothing to audit)', () => {
    const result = runAuditChain()
    const readOnly = result.rows.filter((r) => r.mutatingMethods.length === 0)
    expect(readOnly.length).toBeGreaterThan(0)
    expect(readOnly.every((r) => r.classification === 'AUDITED')).toBe(true)
  })

  it('detects logAuditEvent calls in the route body', () => {
    const result = runAuditChain()
    // At least one AUDITED row should be a mutating route with an
    // audit helper call — otherwise the regex isn't hitting.
    const mutatingAudited = result.rows.filter(
      (r) =>
        r.classification === 'AUDITED' &&
        r.mutatingMethods.length > 0 &&
        !r.reason.includes('no mutating methods'),
    )
    expect(mutatingAudited.length).toBeGreaterThan(0)
  })

  it('INTENTIONAL_NO_AUDIT allowlist includes webhook + auth + cron entries', () => {
    expect(INTENTIONAL_NO_AUDIT).toContain('webhooks/webflow/route.ts')
    expect(INTENTIONAL_NO_AUDIT).toContain('auth/[...nextauth]/route.ts')
    expect(INTENTIONAL_NO_AUDIT).toContain('cron/audit-auth-weekly/route.ts')
    expect(INTENTIONAL_NO_AUDIT).toContain('cron/hitl-sla-sweep/route.ts')
  })

  it('MISSING_AUDIT bucket is the violation surface (may be non-empty today — audit is informational)', () => {
    const result = runAuditChain()
    // Every MISSING_AUDIT row must be a mutating handler with no
    // audit call AND not on the allowlist AND not a stub.
    for (const row of result.missing) {
      expect(row.classification).toBe('MISSING_AUDIT')
      expect(row.mutatingMethods.length).toBeGreaterThan(0)
      expect(INTENTIONAL_NO_AUDIT).not.toContain(row.path)
    }
  })
})
