#!/usr/bin/env ts-node
/**
 * A-004 · Jurisdiction audit (static · informational)
 *
 * D-006 reset the platform's primary jurisdiction from US (USCIS / RFE /
 * EB5 / H1B / N400 / IOLTA / ABA / DS-160) to Portugal (SEF/AIMA / OA /
 * D1-D8 / Golden Visa / Startup / Family Reunification / CTA / EU GDPR),
 * with UAE (GDRFA/ICA / MOJ / PDPL) scheduled for v1.x.
 *
 * Every occurrence of the legacy US terminology in source code or the
 * knowledge base is either:
 *   a) a documented back-compat reference inside a comment block that
 *      points to D-006 (ALLOWED), or
 *   b) a place that still needs re-targeting (A-004 hit — Sev-3 bug
 *      per docs/EXECUTION_PLAN.md §4.1).
 *
 * This script walks the repo, reports hits, and prints a per-term
 * count. Exit code is NON-ZERO only when a hit appears in a file the
 * caller passed via --strict (e.g., --strict src-only). For routine
 * CI it runs informationally and exits 0 with a summary.
 *
 * Usage:
 *   npx ts-node scripts/audit-jurisdiction.ts
 *   npx ts-node scripts/audit-jurisdiction.ts --json
 *   npx ts-node scripts/audit-jurisdiction.ts --strict src-only
 *
 * See docs/EXECUTION_PLAN.md §2.1 (A-004), §2.4 (per-PR gate), §2.5
 * (weekly cron).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

// Directories to skip outright — they don't contain source we own.
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

// File extensions worth scanning.
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json', '.prisma']

// Legacy US-immigration terms (D-006). Each pattern is case-insensitive
// and word-boundary guarded so we don't false-positive on unrelated
// substrings like "h1b" inside "graph1b".
const PATTERNS: Array<{ name: string; regex: RegExp; note: string }> = [
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

// Files that *intentionally* reference legacy terms for traceability —
// audit log, decisions log, plan, claude.md, AGENT_OS.md. These files
// are explicitly excluded from the strict-mode fail list because D-006's
// paper trail lives in them.
const ALLOWLIST_PATHS: string[] = [
  'Claude.md',
  'docs/PRD.md',
  'docs/DECISIONS.md',
  'docs/EXECUTION_LOG.md',
  'docs/EXECUTION_PLAN.md',
  'docs/AGENT_OS.md',
  'docs/prompts',
  'scripts/audit-jurisdiction.ts', // this file
  'CTO_AUDIT_READINESS_REPORT.md',
  'STAGING_TEST_PLAN.md',
  'README.md',
]

interface Hit {
  file: string
  line: number
  term: string
  snippet: string
  allowlisted: boolean
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

function scan(files: string[]): Hit[] {
  const hits: Hit[] = []
  for (const f of files) {
    let content: string
    try {
      content = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    const rel = relative(ROOT, f).replace(/\\/g, '/')
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

function main(): void {
  const args = process.argv.slice(2)
  const jsonOut = args.includes('--json')
  const strictIdx = args.indexOf('--strict')
  const strictMode = strictIdx !== -1 ? (args[strictIdx + 1] ?? 'src-only') : null

  const files: string[] = []
  walk(ROOT, files)
  const hits = scan(files)

  const nonAllowlisted = hits.filter((h) => !h.allowlisted)
  const perTerm = new Map<string, number>()
  for (const h of hits) perTerm.set(h.term, (perTerm.get(h.term) ?? 0) + 1)

  if (jsonOut) {
    console.log(JSON.stringify({
      totalHits: hits.length,
      nonAllowlistedHits: nonAllowlisted.length,
      perTerm: Object.fromEntries(perTerm),
      hits,
    }, null, 2))
  } else {
    console.log('A-004 · Jurisdiction audit (D-006)')
    console.log(`Scanned ${files.length} files (ts/tsx/js/jsx/md/mdx/json/prisma).`)
    console.log(`Hits: ${hits.length} (${nonAllowlisted.length} outside the traceability allowlist).`)
    if (perTerm.size > 0) {
      console.log('')
      console.log('Per term:')
      for (const [term, count] of [...perTerm.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${term.padEnd(22)} ${count}`)
      }
    }
    if (nonAllowlisted.length > 0) {
      console.log('')
      console.log('Non-allowlisted hits (re-target per D-006):')
      for (const h of nonAllowlisted.slice(0, 40)) {
        console.log(`  ${h.file}:${h.line}  [${h.term}]  ${h.snippet}`)
      }
      if (nonAllowlisted.length > 40) {
        console.log(`  … ${nonAllowlisted.length - 40} more`)
      }
    }
  }

  // Strict mode: exit non-zero when src hits exist. Doc files are in
  // the allowlist and never trigger a fail.
  if (strictMode && nonAllowlisted.length > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main()
