#!/usr/bin/env ts-node
/**
 * A-011 · KB freshness audit — CLI wrapper.
 *
 * Thin driver; all logic lives in `lib/audits/kb-staleness.ts`. The
 * weekly cron handler (`app/api/cron/audit-kb-staleness-weekly/
 * route.ts`) calls the same entry point.
 *
 * Usage:
 *   npx tsx scripts/audit-kb-staleness.ts
 *   npx tsx scripts/audit-kb-staleness.ts --json
 *   npx tsx scripts/audit-kb-staleness.ts --strict
 *   npx tsx scripts/audit-kb-staleness.ts --now 2026-07-01
 *
 * Default exit 0 even with stale/expired/invalid articles — the
 * audit is informational per EXECUTION_PLAN §2.1. `--strict` flips
 * bad counts into exit 1. See D-026 for the renumbering history
 * (this audit was A-005 before D-026 reclaimed that slot).
 */

import { runAuditKbStaleness } from '../lib/audits/kb-staleness'

interface Args {
  strict: boolean
  json: boolean
  now: Date
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  let strict = false
  let json = false
  let now = new Date()
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--strict') strict = true
    else if (argv[i] === '--json') json = true
    else if (argv[i] === '--now' && argv[i + 1]) {
      const raw = argv[++i]
      now = new Date(raw)
      if (Number.isNaN(now.getTime())) {
        console.error(`audit-kb-staleness: --now "${raw}" is not a parseable date`)
        process.exit(2)
      }
    }
  }
  return { strict, json, now }
}

function main(): void {
  const { strict, json, now } = parseArgs()
  const result = runAuditKbStaleness({ now })

  if (json) {
    console.log(
      JSON.stringify(
        { ok: result.badCount === 0, strict, ...result },
        null,
        2,
      ),
    )
  } else {
    console.log(`A-011 · KB freshness audit (${result.now})`)
    console.log(`Scanned: ${result.total} articles under skills/`)
    console.log(`  FRESH:   ${result.counts.FRESH}`)
    console.log(`  STALE:   ${result.counts.STALE}`)
    console.log(`  EXPIRED: ${result.counts.EXPIRED}`)
    console.log(`  INVALID: ${result.counts.INVALID}`)
    console.log(`  LEGACY:  ${result.counts.LEGACY}  (pre-v0.1 frontmatter; informational)`)
    console.log('')
    for (const status of ['EXPIRED', 'STALE', 'INVALID'] as const) {
      const rows = result.articles.filter((a) => a.status === status)
      if (!rows.length) continue
      console.log(`${status}:`)
      for (const a of rows) {
        const ageLabel = a.ageDays !== null ? `${a.ageDays}d / ttl ${a.ttlDays}d` : a.reason ?? 'unknown'
        console.log(`  - ${a.path}  [${a.id ?? '?'} · owner ${a.owner ?? '?'}]  ${ageLabel}`)
      }
    }
    if (result.badCount === 0) console.log('OK — every article is fresh.')
    else if (!strict) console.log(`(informational) ${result.badCount} article(s) need attention.`)
    else console.error(`FAILED (--strict) — ${result.badCount} article(s) need attention.`)
  }

  if (strict && result.badCount > 0) process.exit(1)
  process.exit(0)
}

main()
