/**
 * A-002 · Auth-on-every-route audit — library.
 *
 * Pure logic extracted from `scripts/audit-auth.ts` so both the CLI
 * gate (per-PR, in `.github/workflows/ci.yml`) and the weekly cron
 * handler (`app/api/cron/audit-auth-weekly/route.ts`) share the same
 * classifier without shelling out to a child process.
 *
 * Adding / removing a guard helper?  Update `GUARD_PATTERNS` here.
 * Adding an intentionally public route?  Update
 * `INTENTIONAL_PUBLIC` here and leave a comment explaining why the
 * path self-authenticates.
 *
 * See docs/EXECUTION_PLAN.md §2.1 and §2.4.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Paths (relative to app/api/) that are allowed to skip per-caller auth
// because they self-authenticate via HMAC, signed webhook bodies, or
// NextAuth internals. Each entry MUST be defended by a per-route
// signature/bearer check; this audit only confirms the path matches —
// it does not validate the signature logic.
export const INTENTIONAL_PUBLIC: string[] = [
  'auth/[...nextauth]/route.ts',
  'auth/bootstrap/route.ts', // session-required internally, but NextAuth owns the boundary
  'health/route.ts',
  'terms/content/route.ts',
  // HMAC-signed webhook ingress (C-009). Each MUST verify a signature
  // before any side-effect; this script does not validate that — it only
  // confirms the path is allowlisted. Per-webhook smoke (S-009 family)
  // exercises the signature contract.
  'webhooks/webflow/route.ts',
  // Future webhooks/stripe and webhooks/kaspo land here when those
  // sprints arrive (Sprint 8.5 / Sprint 5).
]

export const GUARD_PATTERNS = [
  /\bassertCaseAccess\s*\(/,
  /\bassertOrgAccess\s*\(/,
  /\bassertStaff\s*\(/,
  /\bassertAuthed\s*\(/,
  /\bguardCaseAccess\s*\(/,
  /\bguardOrgAccess\s*\(/,
  /\bguardStaff\s*\(/,
  /\bguardAuthed\s*\(/,
  /\brunAuthed\s*\(/,
  // Cron handlers self-authenticate via `lib/cron.ts` bearer check
  // (`CRON_SECRET`). Added so `/api/cron/*` routes don't have to sit in
  // `INTENTIONAL_PUBLIC`.
  /\brunCron\s*\(/,
  /\bgetServerSession\s*\(/,
]

const STUB_PATTERNS = [
  /NotImplemented/,
  /status:\s*501/,
  /throw\s+new\s+Error\(['"]not[_-]?implemented/i,
]

export type Classification = 'GUARDED' | 'INTENTIONAL_PUBLIC' | 'STUB' | 'UNAUTHED'

export interface Row {
  path: string
  methods: string[]
  classification: Classification
  helpers: string[]
  reason: string
}

export interface AuditAuthResult {
  total: number
  rows: Row[]
  grouped: Record<Classification, Row[]>
  unauthed: Row[]
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, out)
    else if (full.endsWith('route.ts') || full.endsWith('route.tsx')) out.push(full)
  }
}

function extractMethods(src: string): string[] {
  const m = new Set<string>()
  const re = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g
  let match: RegExpExecArray | null
  while ((match = re.exec(src)) !== null) m.add(match[1])
  return [...m].sort()
}

function extractHelpers(src: string): string[] {
  const found = new Set<string>()
  for (const p of GUARD_PATTERNS) {
    const m = p.exec(src)
    if (m) found.add(m[0].replace(/\s*\(/, ''))
  }
  return [...found]
}

function classify(filePath: string, src: string, apiDir: string): Row {
  const methods = extractMethods(src)
  const helpers = extractHelpers(src)

  const relPath = relative(apiDir, filePath).replace(/\\/g, '/')

  if (INTENTIONAL_PUBLIC.includes(relPath)) {
    return { path: relPath, methods, classification: 'INTENTIONAL_PUBLIC', helpers, reason: 'allowlisted' }
  }

  const isStub = methods.length === 0 || STUB_PATTERNS.some((p) => p.test(src))
  if (isStub && helpers.length === 0) {
    return { path: relPath, methods, classification: 'STUB', helpers, reason: 'stub / not-implemented' }
  }

  if (helpers.length > 0) {
    return { path: relPath, methods, classification: 'GUARDED', helpers, reason: `uses ${helpers.join(', ')}` }
  }

  return {
    path: relPath,
    methods,
    classification: 'UNAUTHED',
    helpers,
    reason: 'no auth helper detected — business logic runs unguarded',
  }
}

export function runAuditAuth(opts: { root?: string } = {}): AuditAuthResult {
  const root = opts.root ?? process.cwd()
  const apiDir = join(root, 'app', 'api')
  const files: string[] = []
  walk(apiDir, files)

  const rows: Row[] = files.map((f) => classify(f, readFileSync(f, 'utf8'), apiDir))
  const grouped: Record<Classification, Row[]> = {
    GUARDED: [], INTENTIONAL_PUBLIC: [], STUB: [], UNAUTHED: [],
  }
  for (const r of rows) grouped[r.classification].push(r)
  const unauthed = rows.filter((r) => r.classification === 'UNAUTHED')

  return { total: rows.length, rows, grouped, unauthed }
}
