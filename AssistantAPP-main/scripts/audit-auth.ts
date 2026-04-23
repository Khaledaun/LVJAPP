#!/usr/bin/env ts-node
/**
 * A-002 · Auth-on-every-route audit — CLI wrapper.
 *
 * Thin driver that calls `lib/audits/auth.ts#runAuditAuth` and prints
 * a human-readable (or JSON) report. All logic lives in the library
 * so the weekly cron handler shares the same classifier. See
 * `app/api/cron/audit-auth-weekly/route.ts`.
 *
 * Usage:
 *   npx tsx scripts/audit-auth.ts
 *   npx tsx scripts/audit-auth.ts --json    # machine-readable
 *
 * Exits 0 when no UNAUTHED route is found outside the allowlist, 1
 * otherwise. See docs/EXECUTION_PLAN.md §2.1 and §2.4.
 */

import { runAuditAuth } from '../lib/audits/auth'

function main(): void {
  const jsonOutput = process.argv.includes('--json')
  const result = runAuditAuth()

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        { total: result.total, rows: result.rows, unauthedCount: result.unauthed.length },
        null,
        2,
      ),
    )
  } else {
    console.log('A-002 Auth-on-every-route audit')
    console.log(`Scanned: ${result.total} route.ts files under app/api/`)
    console.log(`  GUARDED:            ${result.grouped.GUARDED.length}`)
    console.log(`  INTENTIONAL_PUBLIC: ${result.grouped.INTENTIONAL_PUBLIC.length}`)
    console.log(`  STUB:               ${result.grouped.STUB.length}`)
    console.log(`  UNAUTHED:           ${result.grouped.UNAUTHED.length}`)
    console.log('')

    if (result.unauthed.length > 0) {
      console.error('UNAUTHED routes (block merge per docs/EXECUTION_PLAN.md §2.4):')
      for (const r of result.unauthed) {
        console.error(`  - ${r.path}  [${r.methods.join(',') || '(no methods)'}]  ${r.reason}`)
      }
    }
  }

  process.exit(result.unauthed.length === 0 ? 0 : 1)
}

main()
