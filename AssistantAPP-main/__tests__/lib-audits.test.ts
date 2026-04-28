/**
 * @jest-environment node
 *
 * Direct unit tests for the four `lib/audits/*` modules. The cron
 * handler tests + the CLI scripts cover them indirectly; these
 * tests exercise the library entry points without the wrapper, so
 * a regression in `runAuditX()` shows up here first.
 *
 * All run against the live repo (no fixtures): the audits are pure
 * filesystem reads, so the assertions check structural invariants
 * (counts > 0, types correct, current branch is clean) rather than
 * exact string matches that would break on every routine commit.
 */
import { describe, it, expect } from '@jest/globals'
import { runAuditAuth, INTENTIONAL_PUBLIC, GUARD_PATTERNS } from '@/lib/audits/auth'
import { runAuditDynamic } from '@/lib/audits/dynamic'
import { runAuditTenant, INTENTIONAL_PUBLIC_ROUTES } from '@/lib/audits/tenant'
import { runAuditJurisdiction, ALLOWLIST_PATHS, PATTERNS } from '@/lib/audits/jurisdiction'

describe('lib/audits/auth · runAuditAuth', () => {
  it('returns the four-bucket grouped structure', () => {
    const result = runAuditAuth()
    expect(result.total).toBeGreaterThan(0)
    expect(Object.keys(result.grouped).sort()).toEqual([
      'GUARDED', 'INTENTIONAL_PUBLIC', 'STUB', 'UNAUTHED',
    ])
    expect(result.rows.length).toBe(result.total)
    expect(result.unauthed.every((r) => r.classification === 'UNAUTHED')).toBe(true)
  })

  it('classifies the canonical INTENTIONAL_PUBLIC routes correctly', () => {
    const result = runAuditAuth()
    const publicRows = result.grouped.INTENTIONAL_PUBLIC.map((r) => r.path).sort()
    // Every entry in the static allowlist must show up in the report
    // exactly once (allow extras for files that reach the path).
    for (const allowed of INTENTIONAL_PUBLIC) {
      expect(publicRows).toContain(allowed)
    }
  })

  it('runCron is in GUARD_PATTERNS (D-026 — cron handlers stay off the public allowlist)', () => {
    const hasRunCron = GUARD_PATTERNS.some((re) => re.test('runCron('))
    expect(hasRunCron).toBe(true)
  })

  it('current branch is UNAUTHED-clean (regression guard for A-002)', () => {
    expect(runAuditAuth().unauthed).toHaveLength(0)
  })

  it('every cron handler I shipped on this branch classifies as GUARDED', () => {
    const result = runAuditAuth()
    const cronRows = result.rows.filter((r) => r.path.startsWith('cron/audit-'))
    expect(cronRows.length).toBeGreaterThanOrEqual(4)
    expect(cronRows.every((r) => r.classification === 'GUARDED')).toBe(true)
  })
})

describe('lib/audits/dynamic · runAuditDynamic', () => {
  it('classifies every walked file as either DB_READING or STATIC_OK', () => {
    const result = runAuditDynamic()
    expect(result.total).toBe(result.dbReading + result.staticOk)
    expect(result.rows.every((r) =>
      r.classification === 'DB_READING' || r.classification === 'STATIC_OK',
    )).toBe(true)
  })

  it('current branch has zero violations (D-025 §4)', () => {
    expect(runAuditDynamic().violations).toHaveLength(0)
  })

  it('a known DB-reading route declares both force-dynamic + revalidate=0', () => {
    const result = runAuditDynamic()
    // app/api/cases/route.ts was one of the 8 routes I patched.
    const cases = result.rows.find((r) => r.path === 'api/cases/route.ts')
    expect(cases).toBeDefined()
    expect(cases!.classification).toBe('DB_READING')
    expect(cases!.hasForceDynamic).toBe(true)
    expect(cases!.hasRevalidateZero).toBe(true)
  })

  it('a STATIC_OK route does NOT need force-dynamic and is not flagged', () => {
    const result = runAuditDynamic()
    const staticRow = result.rows.find((r) => r.classification === 'STATIC_OK')
    expect(staticRow).toBeDefined()
    // Even if it lacks force-dynamic, it shouldn't appear in violations.
    const inViolations = result.violations.some((v) => v.path === staticRow!.path)
    expect(inViolations).toBe(false)
  })
})

describe('lib/audits/tenant · runAuditTenant', () => {
  it('parses schema models with tenantId and lib/tenants.ts allowlists', () => {
    const result = runAuditTenant()
    expect(result.schemaErrors).toHaveLength(0)
    expect(result.schema.modelsWithTenantId.length).toBeGreaterThan(0)
    expect(result.schema.scopedInLib.length).toBeGreaterThan(0)
  })

  it('schema and lib/tenants.ts agree (no missing/extra models)', () => {
    const result = runAuditTenant()
    expect(result.schema.missingFromLib).toEqual([])
    expect(result.schema.extraInLib).toEqual([])
  })

  it('every prisma-using route either uses a tenant helper or sits on the allowlist', () => {
    expect(runAuditTenant().violations).toEqual([])
  })

  it('INTENTIONAL_PUBLIC_ROUTES is non-empty and includes the canonical entries', () => {
    expect(INTENTIONAL_PUBLIC_ROUTES.length).toBeGreaterThan(0)
    expect(INTENTIONAL_PUBLIC_ROUTES).toContain('app/api/health/route.ts')
    expect(INTENTIONAL_PUBLIC_ROUTES).toContain('app/api/auth/[...nextauth]/route.ts')
    expect(INTENTIONAL_PUBLIC_ROUTES).toContain('app/api/webhooks/webflow/route.ts')
  })

  it('ok flag is true on a clean branch', () => {
    expect(runAuditTenant().ok).toBe(true)
  })
})

describe('lib/audits/jurisdiction · runAuditJurisdiction', () => {
  it('walks the repo and produces hits + perTerm + nonAllowlisted partitions', () => {
    const result = runAuditJurisdiction()
    expect(result.totalFiles).toBeGreaterThan(0)
    expect(Array.isArray(result.hits)).toBe(true)
    expect(typeof result.perTerm).toBe('object')
    expect(result.nonAllowlisted.every((h) => !h.allowlisted)).toBe(true)
  })

  it('does NOT flag itself (lib/audits/jurisdiction.ts is allowlisted)', () => {
    const hits = runAuditJurisdiction().nonAllowlisted
    expect(hits.some((h) => h.file === 'lib/audits/jurisdiction.ts')).toBe(false)
    expect(hits.some((h) => h.file === 'scripts/audit-jurisdiction.ts')).toBe(false)
  })

  it('every PATTERNS entry has a name + regex + note', () => {
    expect(PATTERNS.length).toBeGreaterThan(0)
    for (const p of PATTERNS) {
      expect(typeof p.name).toBe('string')
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.regex).toBeInstanceOf(RegExp)
      expect(typeof p.note).toBe('string')
    }
  })

  it('ALLOWLIST_PATHS includes the contract-doc set', () => {
    expect(ALLOWLIST_PATHS).toContain('Claude.md')
    expect(ALLOWLIST_PATHS).toContain('docs/EXECUTION_PLAN.md')
    expect(ALLOWLIST_PATHS).toContain('docs/DECISIONS.md')
  })
})
