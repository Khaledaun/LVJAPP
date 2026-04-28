#!/usr/bin/env tsx
/**
 * A-012 · advice_class gatekeeping audit — CLI wrapper.
 *
 * Logic lives in `lib/audits/advice-class.ts`. Exits 0 clean,
 * 1 on any non-allowlisted, non-paired `adviceClass:
 * 'attorney_approved_advice'` write.
 */
import { runAuditAdviceClass } from '../lib/audits/advice-class'

function main(): void {
  const json = process.argv.includes('--json')
  const result = runAuditAdviceClass()

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: result.violations.length === 0,
          totalFiles: result.totalFiles,
          hits: result.hits,
          violations: result.violations,
        },
        null,
        2,
      ),
    )
  } else {
    console.log('A-012 · advice_class gatekeeping audit (PRD R1)')
    console.log(`Scanned ${result.totalFiles} ts/tsx/js/jsx files.`)
    console.log(`Hits: ${result.hits.length} (${result.violations.length} violations).`)
    if (result.violations.length === 0) {
      console.log('OK — every attorney_approved_advice write is paired with a gatekeeping helper (or allowlisted).')
    } else {
      console.error('')
      console.error('VIOLATIONS (pair with assertCanSetAdviceClass or guardAdviceClass):')
      for (const v of result.violations) {
        console.error(`  - ${v.file}:${v.line}  ${v.snippet}`)
      }
      console.error('')
      console.error('Sev-1 UPL exposure per docs/PRD.md §7.1 R1.')
    }
  }

  process.exit(result.violations.length === 0 ? 0 : 1)
}

main()
