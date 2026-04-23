#!/usr/bin/env tsx
/**
 * Env validator CLI.
 *
 * Prints the `validateEnv()` report. Exit code:
 *   0 — no errors (warnings allowed).
 *   1 — at least one error.
 *   2 — bad invocation.
 *
 * Usage:
 *   npx tsx scripts/check-env.ts
 *   npx tsx scripts/check-env.ts --json
 *   VERCEL_ENV=production npx tsx scripts/check-env.ts
 *
 * CI / deploy runbooks: run this after provisioning env vars on a
 * new Vercel project / before flipping `CSRF_MODE` or
 * `RATE_LIMIT_MODE` to enforce.
 */

import { validateEnv } from '../lib/env-validate'

function main(): void {
  const json = process.argv.includes('--json')
  const report = validateEnv()

  if (json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`env-check · environment=${report.environment}`)
    console.log(`  errors:   ${report.errors.length}`)
    console.log(`  warnings: ${report.warnings.length}`)
    console.log('')
    if (report.errors.length) {
      console.error('ERRORS:')
      for (const e of report.errors) console.error(`  - ${e.key}  ${e.message}`)
      console.error('')
    }
    if (report.warnings.length) {
      console.log('warnings:')
      for (const w of report.warnings) console.log(`  - ${w.key}  ${w.message}`)
      console.log('')
    }
    if (!report.errors.length && !report.warnings.length) {
      console.log('OK — no env issues detected.')
    }
  }

  process.exit(report.errors.length === 0 ? 0 : 1)
}

main()
