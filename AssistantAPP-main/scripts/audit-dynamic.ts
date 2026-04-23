#!/usr/bin/env ts-node
/**
 * A-005 · Dynamic-route audit — CLI wrapper.
 *
 * Thin driver; all logic lives in `lib/audits/dynamic.ts` so the
 * weekly cron handler can share it. See docs/DECISIONS.md D-025 and
 * docs/EXECUTION_PLAN.md §4.1.
 *
 * Usage:
 *   npx tsx scripts/audit-dynamic.ts
 *   npx tsx scripts/audit-dynamic.ts --json
 *
 * Exit 0 on clean, 1 on any violation.
 */

import { runAuditDynamic } from '../lib/audits/dynamic'

function main(): void {
  const jsonOutput = process.argv.includes('--json')
  const result = runAuditDynamic()

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          ok: result.violations.length === 0,
          total: result.total,
          dbReading: result.dbReading,
          staticOk: result.staticOk,
          violations: result.violations,
        },
        null,
        2,
      ),
    )
  } else {
    console.log('A-005 Dynamic-route audit (D-025 item 4)')
    console.log(`Scanned: ${result.total} files under app/`)
    console.log(`  DB_READING: ${result.dbReading}`)
    console.log(`  STATIC_OK:  ${result.staticOk}`)
    console.log('')
    if (result.violations.length === 0) {
      console.log('OK — every DB-reading handler/page opts out of caching.')
    } else {
      console.error(
        `FAILED — ${result.violations.length} violation(s) (block merge per docs/DECISIONS.md D-025):`,
      )
      for (const v of result.violations) {
        const reason =
          v.rule === 'missing_force_dynamic'
            ? "missing `export const dynamic = 'force-dynamic'`"
            : 'missing `export const revalidate = 0`'
        console.error(`  - [${v.kind}] ${v.path}  ${reason}  (DB marker: ${v.marker})`)
      }
      console.error('')
      console.error(
        'Fix: add both exports at the top of the file. See app/api/cases/[id]/meta/route.ts for the canonical shape.',
      )
    }
  }
  process.exit(result.violations.length === 0 ? 0 : 1)
}

main()
