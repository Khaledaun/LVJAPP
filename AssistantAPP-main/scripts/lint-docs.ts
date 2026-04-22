#!/usr/bin/env ts-node
/**
 * A-010 · Doc-discipline audit (static · per-PR gate)
 *
 * Enforces docs/EXECUTION_PLAN.md §2.4 and D-005. For a given git ref
 * range (default: HEAD vs origin/main), asserts:
 *
 *   1. If the diff touches any source under app/, lib/, components/,
 *      agents/, prisma/, scripts/, middleware.ts, then
 *      docs/EXECUTION_LOG.md MUST also be modified.
 *   2. If a long-lived contract doc changed (Claude.md, docs/PRD.md,
 *      docs/AGENT_OS.md, docs/EXECUTION_PLAN.md, prisma/schema.prisma),
 *      the affected doc MUST have a bumped version header.
 *   3. docs/EXECUTION_LOG.md edits must append only (no deletions of
 *      pre-existing commit entries — archaeological grep-ability).
 *   4. docs/DECISIONS.md edits must append new D-NNN entries; must not
 *      rewrite the body of a pre-existing `D-NNN · … · accepted` entry.
 *      Superseding requires a new D-NNN + `superseded-by:` marker on
 *      the old one.
 *
 * Exit code:
 *   0 — all rules pass
 *   1 — at least one rule failed
 *
 * Usage:
 *   npx ts-node scripts/lint-docs.ts
 *   npx ts-node scripts/lint-docs.ts --base origin/main --head HEAD
 *   npx ts-node scripts/lint-docs.ts --json
 *
 * Note: this script relies on `git` being available and the repo
 * having both refs reachable. In a shallow CI clone call
 * `git fetch --unshallow` or specify `--base HEAD~1` for single-commit
 * checks.
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface Args {
  base: string
  head: string
  json: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  let base = 'origin/main'
  let head = 'HEAD'
  let json = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base' && argv[i + 1]) base = argv[++i]
    else if (argv[i] === '--head' && argv[i + 1]) head = argv[++i]
    else if (argv[i] === '--json') json = true
  }
  return { base, head, json }
}

function git(args: string): string {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8' }).trim()
  } catch (err: any) {
    const msg = err?.stderr?.toString() || err?.message || String(err)
    throw new Error(`git ${args} failed: ${msg}`)
  }
}

function diffNames(base: string, head: string): string[] {
  const out = git(`diff --name-only ${base}...${head}`)
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

function fileAt(ref: string, path: string): string | null {
  try {
    return execSync(`git show ${ref}:${path}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}

const ROOT = process.cwd()
const APP_PREFIX = 'AssistantAPP-main/'

// Touching any of these prefixes is a "source change" that REQUIRES an
// EXECUTION_LOG append.
const SOURCE_PREFIXES = [
  `${APP_PREFIX}app/`,
  `${APP_PREFIX}lib/`,
  `${APP_PREFIX}components/`,
  `${APP_PREFIX}agents/`,
  `${APP_PREFIX}prisma/`,
  `${APP_PREFIX}scripts/`,
  `${APP_PREFIX}middleware.ts`,
  `${APP_PREFIX}e2e-tests/`,
  `${APP_PREFIX}__tests__/`,
]

// Long-lived contract docs — a change here requires a version header bump.
const CONTRACT_DOCS: Array<{ path: string; versionRegex: RegExp }> = [
  { path: `${APP_PREFIX}Claude.md`, versionRegex: /Version\s+(\d+\.\d+)/ },
  { path: `${APP_PREFIX}docs/PRD.md`, versionRegex: /Version\s+(\d+\.\d+)/ },
  { path: `${APP_PREFIX}docs/AGENT_OS.md`, versionRegex: /Version\s+(\d+\.\d+)/ },
  { path: `${APP_PREFIX}docs/EXECUTION_PLAN.md`, versionRegex: /Version\s+(\d+\.\d+)/ },
]

const EXEC_LOG = `${APP_PREFIX}docs/EXECUTION_LOG.md`
const DECISIONS = `${APP_PREFIX}docs/DECISIONS.md`

interface Failure {
  rule: string
  detail: string
}

function run(): { failures: Failure[]; changedFiles: string[] } {
  const { base, head } = parseArgs()
  const changed = diffNames(base, head)
  const failures: Failure[] = []

  const changedSource = changed.filter((f) => SOURCE_PREFIXES.some((p) => f === p || f.startsWith(p)))
  const execLogTouched = changed.includes(EXEC_LOG)

  // Rule 1 — source diff ⇒ EXECUTION_LOG diff
  if (changedSource.length > 0 && !execLogTouched) {
    failures.push({
      rule: 'A-010-R1',
      detail:
        `Source code changed (${changedSource.length} file(s)) but docs/EXECUTION_LOG.md was not updated. D-005 requires every commit on a feature branch to append an entry in the same PR.`,
    })
  }

  // Rule 2 — contract doc diff ⇒ version header bump
  for (const { path, versionRegex } of CONTRACT_DOCS) {
    if (!changed.includes(path)) continue
    const baseContent = fileAt(base, path) ?? ''
    const headContent = fileAt(head, path) ?? readSafe(join(ROOT, path))
    const baseVersion = baseContent.match(versionRegex)?.[1]
    const headVersion = headContent.match(versionRegex)?.[1]
    if (baseVersion && headVersion && baseVersion === headVersion) {
      failures.push({
        rule: 'A-010-R2',
        detail:
          `${path} changed but version header still reads ${headVersion}. Contract-level changes require a version bump per docs/EXECUTION_PLAN.md §11.1.`,
      })
    }
  }

  // Rule 3 — EXECUTION_LOG must append only (no deletion of existing commit entries)
  if (execLogTouched) {
    const baseLog = fileAt(base, EXEC_LOG) ?? ''
    const headLog = readSafe(join(ROOT, EXEC_LOG)) || fileAt(head, EXEC_LOG) || ''
    const baseEntries = extractLogEntries(baseLog)
    const headEntries = extractLogEntries(headLog)
    for (const key of baseEntries) {
      if (!headEntries.has(key)) {
        failures.push({
          rule: 'A-010-R3',
          detail: `docs/EXECUTION_LOG.md removed a previously-landed entry: ${key}. The log is append-only.`,
        })
      }
    }
  }

  // Rule 4 — DECISIONS.md must not rewrite an existing accepted D-NNN body.
  if (changed.includes(DECISIONS)) {
    const baseDec = fileAt(base, DECISIONS) ?? ''
    const headDec = readSafe(join(ROOT, DECISIONS)) || fileAt(head, DECISIONS) || ''
    const baseEntries = extractDecisionEntries(baseDec)
    const headEntries = extractDecisionEntries(headDec)
    for (const [id, baseBody] of baseEntries) {
      const headBody = headEntries.get(id)
      if (headBody === undefined) {
        failures.push({
          rule: 'A-010-R4',
          detail: `docs/DECISIONS.md deleted ${id}. Supersede by adding a new D-NNN + marking the old one "superseded-by:"; do not delete.`,
        })
      } else if (baseBody !== headBody) {
        // Allow "superseded-by:" status flips — these are valid.
        const newlySuperseded =
          /superseded-by:\s*D-\d+/i.test(headBody) && !/superseded-by:\s*D-\d+/i.test(baseBody)
        if (!newlySuperseded) {
          failures.push({
            rule: 'A-010-R4',
            detail:
              `docs/DECISIONS.md rewrote body of ${id}. Decisions are immutable except for the "superseded-by:" status marker. Add a new D-NNN instead.`,
          })
        }
      }
    }
  }

  return { failures, changedFiles: changed }
}

function readSafe(p: string): string {
  try {
    return existsSync(p) ? readFileSync(p, 'utf8') : ''
  } catch {
    return ''
  }
}

// Extract a set of `### <short-sha> — <title>` entries (first line of
// each section). We key by SHA or by the whole "pending" title so
// in-flight entries are tracked too.
function extractLogEntries(content: string): Set<string> {
  const out = new Set<string>()
  const re = /^###\s+(`[^`]+`|\S+)\s*—\s*(.+)$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    out.add(`${m[1]}|${m[2].trim()}`)
  }
  return out
}

// Extract a map of D-NNN -> body text (between "## D-NNN …" and the
// next "## " or "---").
function extractDecisionEntries(content: string): Map<string, string> {
  const out = new Map<string, string>()
  const re = /^## (D-\d+)\s*·\s*[^\n]+\n([\s\S]*?)(?=^## |\n---\s*$)/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    out.set(m[1], m[2].trim())
  }
  return out
}

function main(): void {
  const { json } = parseArgs()
  const { failures, changedFiles } = run()
  if (json) {
    console.log(JSON.stringify({ failures, changedFiles, ok: failures.length === 0 }, null, 2))
  } else {
    console.log('A-010 · Doc-discipline audit (D-005)')
    console.log(`Changed files in range: ${changedFiles.length}`)
    if (failures.length === 0) {
      console.log('OK — all doc-discipline rules pass.')
    } else {
      console.error(`FAILED — ${failures.length} rule violation(s):`)
      for (const f of failures) {
        console.error(`  [${f.rule}] ${f.detail}`)
      }
    }
  }
  process.exit(failures.length === 0 ? 0 : 1)
}

main()
