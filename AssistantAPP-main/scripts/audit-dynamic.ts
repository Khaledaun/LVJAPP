#!/usr/bin/env ts-node
/**
 * A-005 · Dynamic-route audit (D-025 item 4)
 *
 * Static check that every DB-reading App-Router handler and page
 * declares `export const dynamic = 'force-dynamic'` and
 * `export const revalidate = 0`.
 *
 * Why this is required from day 1: Next.js App Router pre-renders
 * statically by default. A handler that imports Prisma but never
 * opts out of caching will be served as cached HTML (or as a cached
 * route response) regardless of what `middleware.ts` decides —
 * middleware runs on the *request*, not on the cached *response*,
 * so static pre-render is a silent auth-bypass. See D-025 item 4.
 *
 * Classification of each `app/api/ ** /route.ts(x)` and
 * `app/ ** /page.tsx`:
 *
 *   - DB_READING  — imports `@/lib/db` / `getPrisma` / `prisma`,
 *                   or calls `runAuthed` / `runPlatformOp` / uses
 *                   `prisma.*` after an import. These MUST declare
 *                   both `dynamic = 'force-dynamic'` and
 *                   `revalidate = 0`.
 *   - STATIC_OK   — doesn't touch the DB (constants, pure compute,
 *                   external API fetch with its own auth). No
 *                   requirement.
 *
 * Violation rules (exit 1 on any):
 *   - DB_READING file with no `force-dynamic` export.
 *   - DB_READING file with no `revalidate = 0` export.
 *
 * Exit 0 on clean, 1 on any violation.
 *
 * Usage:
 *   npx tsx scripts/audit-dynamic.ts
 *   npx tsx scripts/audit-dynamic.ts --json
 *
 * See docs/DECISIONS.md D-025 and docs/EXECUTION_PLAN.md §4.1.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const APP_DIR = join(ROOT, 'app')

// Indicators that a file touches Prisma / DB. If any of these match
// the file is classified DB_READING and must opt out of caching.
const DB_PATTERNS: RegExp[] = [
  /\bfrom\s+['"]@\/lib\/db['"]/,
  /\bfrom\s+['"](?:\.\.?\/)+lib\/db['"]/,
  /\bgetPrisma\s*\(/,
  /\brunAuthed\s*\(/,
  /\brunPlatformOp\s*\(/,
  /\bprisma\.[a-zA-Z_][\w]*/,
]

const FORCE_DYNAMIC_RE =
  /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/
const REVALIDATE_ZERO_RE =
  /export\s+const\s+revalidate\s*=\s*0\b/

// Files that MUST be DB_READING but are allowed to skip the
// revalidate/dynamic requirement because they are structurally
// static in a way the audit can't see. Empty today; keep as
// an escape hatch with a written justification per entry.
const INTENTIONAL_STATIC: string[] = []

type Classification = 'DB_READING' | 'STATIC_OK'

interface Row {
  path: string
  kind: 'route' | 'page'
  classification: Classification
  hasForceDynamic: boolean
  hasRevalidateZero: boolean
  dbMarkers: string[]
}

interface Violation {
  path: string
  kind: 'route' | 'page'
  rule: 'missing_force_dynamic' | 'missing_revalidate_zero'
  marker: string
}

function walk(dir: string, out: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) {
      walk(full, out)
      continue
    }
    if (full.endsWith('route.ts') || full.endsWith('route.tsx')) {
      out.push(full)
    } else if (full.endsWith('page.tsx') || full.endsWith('page.ts')) {
      out.push(full)
    }
  }
}

function detectDbMarkers(src: string): string[] {
  const markers: string[] = []
  for (const re of DB_PATTERNS) {
    const m = re.exec(src)
    if (m) markers.push(m[0])
  }
  return markers
}

function classify(path: string): Row {
  const src = readFileSync(path, 'utf8')
  const kind: 'route' | 'page' = path.endsWith('page.tsx') || path.endsWith('page.ts') ? 'page' : 'route'
  const dbMarkers = detectDbMarkers(src)
  const classification: Classification = dbMarkers.length > 0 ? 'DB_READING' : 'STATIC_OK'
  return {
    path: relative(APP_DIR, path).replace(/\\/g, '/'),
    kind,
    classification,
    hasForceDynamic: FORCE_DYNAMIC_RE.test(src),
    hasRevalidateZero: REVALIDATE_ZERO_RE.test(src),
    dbMarkers,
  }
}

function main(): void {
  const jsonOutput = process.argv.includes('--json')
  const files: string[] = []
  walk(APP_DIR, files)

  const rows: Row[] = files.map(classify)
  const violations: Violation[] = []

  for (const r of rows) {
    if (r.classification !== 'DB_READING') continue
    if (INTENTIONAL_STATIC.includes(r.path)) continue
    if (!r.hasForceDynamic) {
      violations.push({
        path: r.path,
        kind: r.kind,
        rule: 'missing_force_dynamic',
        marker: r.dbMarkers[0] ?? '',
      })
    }
    if (!r.hasRevalidateZero) {
      violations.push({
        path: r.path,
        kind: r.kind,
        rule: 'missing_revalidate_zero',
        marker: r.dbMarkers[0] ?? '',
      })
    }
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          ok: violations.length === 0,
          total: rows.length,
          dbReading: rows.filter((r) => r.classification === 'DB_READING').length,
          staticOk: rows.filter((r) => r.classification === 'STATIC_OK').length,
          violations,
        },
        null,
        2,
      ),
    )
  } else {
    const dbReading = rows.filter((r) => r.classification === 'DB_READING').length
    const staticOk = rows.filter((r) => r.classification === 'STATIC_OK').length
    console.log('A-005 Dynamic-route audit (D-025 item 4)')
    console.log(`Scanned: ${rows.length} files under app/`)
    console.log(`  DB_READING: ${dbReading}`)
    console.log(`  STATIC_OK:  ${staticOk}`)
    console.log('')
    if (violations.length === 0) {
      console.log('OK — every DB-reading handler/page opts out of caching.')
    } else {
      console.error(
        `FAILED — ${violations.length} violation(s) (block merge per docs/DECISIONS.md D-025):`,
      )
      for (const v of violations) {
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
  process.exit(violations.length === 0 ? 0 : 1)
}

main()
