#!/usr/bin/env tsx
/**
 * A-013 · Audit-chain completeness audit — CLI wrapper.
 *
 * Walks `app/api/**` and classifies every route file:
 *   AUDITED              — mutating handler with an audit call, OR
 *                          non-mutating route (nothing to audit)
 *   INTENTIONAL_NO_AUDIT — allowlisted (see lib/audits/audit-chain.ts)
 *   STUB                 — throws not-implemented or returns 501
 *   MISSING_AUDIT        — mutating handler, no audit call, not
 *                          allowlisted. This is the violation bucket.
 *
 * Usage:
 *   npx tsx scripts/audit-chain.ts
 *   npx tsx scripts/audit-chain.ts --json
 *   npx tsx scripts/audit-chain.ts --strict     # exit 1 on MISSING_AUDIT
 *
 * Defaults to informational exit 0. `--strict` promotes MISSING_AUDIT
 * to a hard fail — wire this once the violation count hits zero.
 */
import { runAuditChain } from '../lib/audits/audit-chain'

function main(): void {
  const argv = process.argv.slice(2)
  const json = argv.includes('--json')
  const strict = argv.includes('--strict')
  const result = runAuditChain()

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: result.missing.length === 0,
          total: result.total,
          counts: {
            AUDITED: result.grouped.AUDITED.length,
            INTENTIONAL_NO_AUDIT: result.grouped.INTENTIONAL_NO_AUDIT.length,
            STUB: result.grouped.STUB.length,
            MISSING_AUDIT: result.grouped.MISSING_AUDIT.length,
          },
          rows: result.rows,
        },
        null,
        2,
      ),
    )
  } else {
    console.log('A-013 · Audit-chain completeness audit (PRD §5.5)')
    console.log(`Scanned: ${result.total} route.ts files under app/api/`)
    console.log(`  AUDITED:              ${result.grouped.AUDITED.length}`)
    console.log(`  INTENTIONAL_NO_AUDIT: ${result.grouped.INTENTIONAL_NO_AUDIT.length}`)
    console.log(`  STUB:                 ${result.grouped.STUB.length}`)
    console.log(`  MISSING_AUDIT:        ${result.grouped.MISSING_AUDIT.length}`)
    console.log('')
    if (result.missing.length === 0) {
      console.log('OK — every mutating handler has an audit call or is justified.')
    } else {
      const header = strict ? 'FAILED' : 'MISSING_AUDIT (informational)'
      console.error(`${header} — ${result.missing.length} mutating handler(s) without an audit call:`)
      for (const r of result.missing) {
        console.error(`  - ${r.path}  [${r.mutatingMethods.join(',')}]`)
      }
      console.error('')
      console.error(
        'Fix: add logAuditEvent(...) inside the handler, OR append the path to ' +
        'INTENTIONAL_NO_AUDIT in lib/audits/audit-chain.ts with a justification.',
      )
    }
  }

  if (strict && result.missing.length > 0) process.exit(1)
  process.exit(0)
}

main()
