/**
 * A-012 · advice_class gatekeeping audit (PRD R1 / D-006).
 *
 * Static sweep for any code that writes
 * `adviceClass: 'attorney_approved_advice'` or the double-quoted
 * variant. Every such write MUST sit in a file that also calls
 * `assertCanSetAdviceClass` / `guardAdviceClass` from
 * `@/lib/rbac-advice-class`. Unpaired writes are Sev-1 UPL
 * exposures per PRD §7.1 R1.
 *
 * Allowlist: test files and fixtures may assert the literal
 * without the helper (they're testing classification, not
 * granting advice). Matched by path prefix:
 * `__tests__/`, `e2e-tests/`, `test-utils/`, `test-data/`.
 * Also self-allowlists the library + CLI file so the pattern
 * strings here don't self-flag.
 *
 * CLI: `npx tsx scripts/audit-advice-class.ts`
 * JSON: `npx tsx scripts/audit-advice-class.ts --json`
 * Exits 0 clean, 1 on violations.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build',
  'coverage', 'playwright-report', 'test-results',
])

const EXTS = ['.ts', '.tsx', '.js', '.jsx']

// Path prefixes exempt from the audit (tests + fixtures).
const ALLOWLIST_PREFIXES = [
  '__tests__/',
  'e2e-tests/',
  'test-utils/',
  'test-data/',
  // Self-allowlist — this file + CLI + the helper lib carry the
  // literal as documentation / pattern strings, not as writes.
  'lib/audits/advice-class.ts',
  'lib/rbac-advice-class.ts',
  'scripts/audit-advice-class.ts',
  // KB articles + docs reference the literal as vocabulary.
  'docs/',
  'skills/',
  'prompts/',
  'agents/',
]

const LITERAL_RE = /adviceClass\s*:\s*(['"])attorney_approved_advice\1/g
const HELPER_RE = /\b(assertCanSetAdviceClass|guardAdviceClass)\s*\(/

export interface Hit {
  file: string
  line: number
  snippet: string
  paired: boolean
  allowlisted: boolean
}

export interface AuditAdviceClassResult {
  totalFiles: number
  hits: Hit[]
  violations: Hit[]
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, out)
    else if (EXTS.some((x) => full.endsWith(x))) out.push(full)
  }
}

function isAllowlisted(rel: string): boolean {
  return ALLOWLIST_PREFIXES.some(
    (p) => rel === p || rel.startsWith(p),
  )
}

function scanFile(filePath: string, root: string): Hit[] {
  let src: string
  try {
    src = readFileSync(filePath, 'utf8')
  } catch {
    return []
  }
  const rel = relative(root, filePath).replace(/\\/g, '/')
  const allowlisted = isAllowlisted(rel)
  const paired = HELPER_RE.test(src)
  const hits: Hit[] = []
  const lines = src.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    LITERAL_RE.lastIndex = 0
    if (LITERAL_RE.test(lines[i])) {
      hits.push({
        file: rel,
        line: i + 1,
        snippet: lines[i].trim().slice(0, 160),
        paired,
        allowlisted,
      })
    }
  }
  return hits
}

export function runAuditAdviceClass(opts: { root?: string } = {}): AuditAdviceClassResult {
  const root = opts.root ?? process.cwd()
  const files: string[] = []
  walk(root, files)
  const hits = files.flatMap((f) => scanFile(f, root))
  const violations = hits.filter((h) => !h.allowlisted && !h.paired)
  return {
    totalFiles: files.length,
    hits,
    violations,
  }
}
