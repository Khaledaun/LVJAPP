/**
 * A-004 · Jurisdiction audit (D-006) — library.
 *
 * Pure logic. CLI wrapper in `scripts/audit-jurisdiction.ts`; the
 * weekly cron handler (`app/api/cron/audit-jurisdiction-weekly/
 * route.ts`) uses the same entry point.
 *
 * D-006 reset the platform's jurisdiction from US to PT (with UAE
 * scheduled for v1.x). Every occurrence of legacy US terminology is
 * either allow-listed (tracker paper trail in docs) or a Sev-3
 * retargeting bug.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
])

const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json', '.prisma']

export const PATTERNS: Array<{ name: string; regex: RegExp; note: string }> = [
  { name: 'USCIS', regex: /\bUSCIS\b/i, note: 'US Citizenship & Immigration Services — replace with SEF / AIMA for PT' },
  { name: 'RFE', regex: /\bRFE\b/i, note: 'Request for Evidence — replace with "pedido de elementos adicionais" for PT' },
  { name: 'EB5', regex: /\bEB-?5\b/i, note: 'US investor visa — replace with Golden Visa / D2' },
  { name: 'H1B', regex: /\bH-?1B\b/i, note: 'US work visa — replace with PT D3 (qualified work) or D8 (digital nomad)' },
  { name: 'N400', regex: /\bN-?400\b/i, note: 'US naturalization — replace with PT nationality law regime' },
  { name: 'N-600', regex: /\bN-?600\b/i, note: 'US citizenship certificate — out of scope per D-006' },
  { name: 'I-9', regex: /\bI-?9\b/i, note: 'US employment eligibility — out of scope per D-006' },
  { name: 'I-130', regex: /\bI-?130\b/i, note: 'US family petition — replace with D6 (Family Reunification)' },
  { name: 'IOLTA', regex: /\bIOLTA\b/i, note: 'US interest-on-lawyer-trust-account — replace with Portuguese CTA' },
  { name: 'DS-160', regex: /\bDS-?160\b/i, note: 'US visa application form — out of scope per D-006' },
  { name: 'ABA Model Rule 1.6', regex: /\bABA\s*Model\s*Rule\s*1\.6\b/i, note: 'US bar confidentiality rule — replace with OA Code of Conduct + EU GDPR' },
  { name: 'ABA Model Rule 5.3', regex: /\bABA\s*Model\s*Rule\s*5\.3\b/i, note: 'US non-lawyer supervision rule — replace with OA equivalent' },
]

export const ALLOWLIST_PATHS: string[] = [
  'Claude.md',
  'docs/PRD.md',
  'docs/DECISIONS.md',
  'docs/EXECUTION_LOG.md',
  'docs/EXECUTION_PLAN.md',
  'docs/AGENT_OS.md',
  'docs/prompts',
  'scripts/audit-jurisdiction.ts',
  'lib/audits/jurisdiction.ts',
  'CTO_AUDIT_READINESS_REPORT.md',
  'STAGING_TEST_PLAN.md',
  'README.md',
]

export interface Hit {
  file: string
  line: number
  term: string
  snippet: string
  allowlisted: boolean
}

export interface AuditJurisdictionResult {
  totalFiles: number
  hits: Hit[]
  nonAllowlisted: Hit[]
  perTerm: Record<string, number>
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

function isAllowlisted(relPath: string): boolean {
  return ALLOWLIST_PATHS.some((p) => relPath === p || relPath.startsWith(p + '/'))
}

function scan(files: string[], root: string): Hit[] {
  const hits: Hit[] = []
  for (const f of files) {
    let content: string
    try {
      content = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    const rel = relative(root, f).replace(/\\/g, '/')
    const allowlisted = isAllowlisted(rel)
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const { name, regex } of PATTERNS) {
        if (regex.test(line)) {
          hits.push({
            file: rel,
            line: i + 1,
            term: name,
            snippet: line.trim().slice(0, 160),
            allowlisted,
          })
        }
      }
    }
  }
  return hits
}

export function runAuditJurisdiction(opts: { root?: string } = {}): AuditJurisdictionResult {
  const root = opts.root ?? process.cwd()
  const files: string[] = []
  walk(root, files)
  const hits = scan(files, root)
  const nonAllowlisted = hits.filter((h) => !h.allowlisted)
  const perTerm: Record<string, number> = {}
  for (const h of hits) perTerm[h.term] = (perTerm[h.term] ?? 0) + 1
  return {
    totalFiles: files.length,
    hits,
    nonAllowlisted,
    perTerm,
  }
}
