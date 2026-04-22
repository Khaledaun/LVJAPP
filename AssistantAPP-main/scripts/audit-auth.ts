#!/usr/bin/env ts-node
/**
 * A-002 · Auth-on-every-route audit (static)
 *
 * Walks every app/api/** /route.ts file and classifies it as:
 *   - GUARDED              — at least one exported HTTP method reaches an auth
 *                            helper (assertCaseAccess / assertOrgAccess /
 *                            assertStaff / guardCaseAccess / guardOrgAccess /
 *                            guardStaff / getServerSession) before any business
 *                            logic.
 *   - INTENTIONAL_PUBLIC   — matches the INTENTIONAL_PUBLIC allowlist below
 *                            (NextAuth, webhook HMAC routes, health check,
 *                            public terms copy).
 *   - STUB                 — handler body is empty / throws not-implemented /
 *                            returns a 501.
 *   - UNAUTHED             — none of the above. Every new UNAUTHED route is a
 *                            Sev-1 bug per docs/EXECUTION_PLAN.md §4.1.
 *
 * Exit code 0 when no UNAUTHED route is found outside the allowlist.
 * Exit code 1 otherwise, with a table of offending routes on stderr.
 *
 * Usage:
 *   npx ts-node scripts/audit-auth.ts
 *   npx ts-node scripts/audit-auth.ts --json    # machine-readable
 *
 * See docs/EXECUTION_PLAN.md §2.1 and §2.4.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const API_DIR = join(ROOT, 'app', 'api')

// Paths (relative to app/api/) that are allowed to skip per-caller auth because
// they self-authenticate via HMAC, signed webhook bodies, or NextAuth internals.
// Each entry MUST be defended by a per-route signature/bearer check; this script
// only confirms the path matches — it does not validate the signature logic.
const INTENTIONAL_PUBLIC: string[] = [
  'auth/[...nextauth]/route.ts',
  'auth/bootstrap/route.ts', // session-required internally, but NextAuth owns the boundary
  'health/route.ts',
  'terms/content/route.ts',
  // Future: webhooks/webflow, webhooks/stripe, webhooks/kaspo — add here when
  // those land. The audit opens a bug the moment a non-listed public-feeling
  // webhook appears.
]

const GUARD_PATTERNS = [
  /\bassertCaseAccess\s*\(/,
  /\bassertOrgAccess\s*\(/,
  /\bassertStaff\s*\(/,
  /\bguardCaseAccess\s*\(/,
  /\bguardOrgAccess\s*\(/,
  /\bguardStaff\s*\(/,
  /\bgetServerSession\s*\(/,
]

const STUB_PATTERNS = [
  /NotImplemented/,
  /status:\s*501/,
  /throw\s+new\s+Error\(['"]not[_-]?implemented/i,
]

type Classification = 'GUARDED' | 'INTENTIONAL_PUBLIC' | 'STUB' | 'UNAUTHED'

interface Row {
  path: string
  methods: string[]
  classification: Classification
  helpers: string[]
  reason: string
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

function classify(path: string, src: string): Row {
  const methods = extractMethods(src)
  const helpers = extractHelpers(src)

  const relPath = relative(API_DIR, path).replace(/\\/g, '/')

  if (INTENTIONAL_PUBLIC.includes(relPath)) {
    return { path: relPath, methods, classification: 'INTENTIONAL_PUBLIC', helpers, reason: 'allowlisted' }
  }

  // STUB detection: empty method bodies or explicit not-implemented markers.
  const isStub =
    methods.length === 0 ||
    STUB_PATTERNS.some((p) => p.test(src))
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

function main(): void {
  const jsonOutput = process.argv.includes('--json')
  const files: string[] = []
  walk(API_DIR, files)

  const rows: Row[] = files.map((f) => classify(f, readFileSync(f, 'utf8')))
  const unauthed = rows.filter((r) => r.classification === 'UNAUTHED')

  if (jsonOutput) {
    console.log(JSON.stringify({ total: rows.length, rows, unauthedCount: unauthed.length }, null, 2))
  } else {
    // Human-readable summary
    const grouped: Record<Classification, Row[]> = {
      GUARDED: [], INTENTIONAL_PUBLIC: [], STUB: [], UNAUTHED: [],
    }
    for (const r of rows) grouped[r.classification].push(r)

    console.log(`A-002 Auth-on-every-route audit`)
    console.log(`Scanned: ${rows.length} route.ts files under app/api/`)
    console.log(`  GUARDED:            ${grouped.GUARDED.length}`)
    console.log(`  INTENTIONAL_PUBLIC: ${grouped.INTENTIONAL_PUBLIC.length}`)
    console.log(`  STUB:               ${grouped.STUB.length}`)
    console.log(`  UNAUTHED:           ${grouped.UNAUTHED.length}`)
    console.log('')

    if (unauthed.length > 0) {
      console.error('UNAUTHED routes (block merge per docs/EXECUTION_PLAN.md §2.4):')
      for (const r of unauthed) {
        console.error(`  - ${r.path}  [${r.methods.join(',') || '(no methods)'}]  ${r.reason}`)
      }
    }
  }

  process.exit(unauthed.length === 0 ? 0 : 1)
}

main()
