#!/usr/bin/env ts-node
/**
 * A-004 · Jurisdiction audit — CLI wrapper.
 *
 * Logic lives in `lib/audits/jurisdiction.ts`; shared by the weekly
 * cron handler. See docs/DECISIONS.md D-006 and
 * docs/EXECUTION_PLAN.md §2.1 (A-004), §2.4, §2.5.
 *
 * Usage:
 *   npx tsx scripts/audit-jurisdiction.ts
 *   npx tsx scripts/audit-jurisdiction.ts --json
 *   npx tsx scripts/audit-jurisdiction.ts --strict src-only
 */

import { runAuditJurisdiction } from '../lib/audits/jurisdiction'

function main(): void {
  const args = process.argv.slice(2)
  const jsonOut = args.includes('--json')
  const strictIdx = args.indexOf('--strict')
  const strictMode = strictIdx !== -1 ? (args[strictIdx + 1] ?? 'src-only') : null

  const result = runAuditJurisdiction()

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          totalHits: result.hits.length,
          nonAllowlistedHits: result.nonAllowlisted.length,
          perTerm: result.perTerm,
          hits: result.hits,
        },
        null,
        2,
      ),
    )
  } else {
    console.log('A-004 · Jurisdiction audit (D-006)')
    console.log(`Scanned ${result.totalFiles} files (ts/tsx/js/jsx/md/mdx/json/prisma).`)
    console.log(
      `Hits: ${result.hits.length} (${result.nonAllowlisted.length} outside the traceability allowlist).`,
    )
    const entries = Object.entries(result.perTerm).sort((a, b) => b[1] - a[1])
    if (entries.length > 0) {
      console.log('')
      console.log('Per term:')
      for (const [term, count] of entries) {
        console.log(`  ${term.padEnd(22)} ${count}`)
      }
    }
    if (result.nonAllowlisted.length > 0) {
      console.log('')
      console.log('Non-allowlisted hits (re-target per D-006):')
      for (const h of result.nonAllowlisted.slice(0, 40)) {
        console.log(`  ${h.file}:${h.line}  [${h.term}]  ${h.snippet}`)
      }
      if (result.nonAllowlisted.length > 40) {
        console.log(`  … ${result.nonAllowlisted.length - 40} more`)
      }
    }
  }

  if (strictMode && result.nonAllowlisted.length > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main()
