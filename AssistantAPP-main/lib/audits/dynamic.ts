/**
 * A-005 · Dynamic-route audit (D-025 item 4) — library.
 *
 * Pure logic for the audit. The CLI wrapper lives in
 * `scripts/audit-dynamic.ts`; the weekly cron handler will wire it
 * up once `app/api/cron/audit-dynamic-weekly/route.ts` lands.
 *
 * See `docs/DECISIONS.md` D-025 and `docs/EXECUTION_PLAN.md` §4.1.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DB_PATTERNS: RegExp[] = [
  /\bfrom\s+['"]@\/lib\/db['"]/,
  /\bfrom\s+['"](?:\.\.?\/)+lib\/db['"]/,
  /\bgetPrisma\s*\(/,
  /\brunAuthed\s*\(/,
  /\brunPlatformOp\s*\(/,
  /\bprisma\.[a-zA-Z_][\w]*/,
]

const FORCE_DYNAMIC_RE = /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/
const REVALIDATE_ZERO_RE = /export\s+const\s+revalidate\s*=\s*0\b/

const INTENTIONAL_STATIC: string[] = []

export type Classification = 'DB_READING' | 'STATIC_OK'

export interface Row {
  path: string
  kind: 'route' | 'page'
  classification: Classification
  hasForceDynamic: boolean
  hasRevalidateZero: boolean
  dbMarkers: string[]
}

export interface Violation {
  path: string
  kind: 'route' | 'page'
  rule: 'missing_force_dynamic' | 'missing_revalidate_zero'
  marker: string
}

export interface AuditDynamicResult {
  total: number
  dbReading: number
  staticOk: number
  rows: Row[]
  violations: Violation[]
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
    if (
      full.endsWith('route.ts') ||
      full.endsWith('route.tsx') ||
      full.endsWith('page.tsx') ||
      full.endsWith('page.ts')
    ) {
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

function classify(filePath: string, appDir: string): Row {
  const src = readFileSync(filePath, 'utf8')
  const kind: 'route' | 'page' =
    filePath.endsWith('page.tsx') || filePath.endsWith('page.ts') ? 'page' : 'route'
  const dbMarkers = detectDbMarkers(src)
  const classification: Classification = dbMarkers.length > 0 ? 'DB_READING' : 'STATIC_OK'
  return {
    path: relative(appDir, filePath).replace(/\\/g, '/'),
    kind,
    classification,
    hasForceDynamic: FORCE_DYNAMIC_RE.test(src),
    hasRevalidateZero: REVALIDATE_ZERO_RE.test(src),
    dbMarkers,
  }
}

export function runAuditDynamic(opts: { root?: string } = {}): AuditDynamicResult {
  const root = opts.root ?? process.cwd()
  const appDir = join(root, 'app')
  const files: string[] = []
  walk(appDir, files)

  const rows: Row[] = files.map((f) => classify(f, appDir))
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

  const dbReading = rows.filter((r) => r.classification === 'DB_READING').length
  const staticOk = rows.filter((r) => r.classification === 'STATIC_OK').length

  return { total: rows.length, dbReading, staticOk, rows, violations }
}
