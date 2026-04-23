#!/usr/bin/env ts-node
/**
 * A-011 · KB freshness audit (EXECUTION_PLAN §2.1 post-D-026)
 *
 * Walks `skills/` recursively, parses each `*.md` file's YAML front-
 * matter, and flags articles whose `reviewed_at` is older than
 * `review_ttl_days`. Informational (not merge-blocking) per the plan
 * catalogue — the weekly cron (`cron/audit-kb-staleness-weekly`)
 * opens a GitHub issue per stale article instead of failing CI.
 *
 * Classification per article:
 *   - FRESH    — `now - reviewed_at <= review_ttl_days`.
 *   - STALE    — `review_ttl_days < (now - reviewed_at) <= 2×ttl`.
 *                Article still reads as `confidence: authoritative`
 *                but has exited its trusted window. Skill owner is
 *                nudged to refresh.
 *   - EXPIRED  — `(now - reviewed_at) > 2×ttl`. Per AGENT_OS §6.4
 *                this auto-demotes `authoritative` → `draft`. The
 *                audit only *reports* — demotion is a separate
 *                change to the frontmatter by the owner.
 *   - INVALID  — frontmatter missing / unparseable. A KB file
 *                without the required fields can't be trusted by
 *                RAG — surface it every time.
 *
 * Exit code:
 *   - `0` by default, even when stale / expired / invalid articles
 *     exist. The audit's value is *visibility*, not gating.
 *   - `--strict` flips stale / expired / invalid into exit 1 for
 *     manual runs or for the eventual blocking-mode promotion.
 *
 * Usage:
 *   npx tsx scripts/audit-kb-staleness.ts
 *   npx tsx scripts/audit-kb-staleness.ts --json
 *   npx tsx scripts/audit-kb-staleness.ts --strict
 *   npx tsx scripts/audit-kb-staleness.ts --now 2026-07-01
 *
 * See D-026 for the renumbering history (this audit was A-005
 * before D-026 reclaimed that slot for dynamic-route).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SKILLS_DIR = join(ROOT, 'skills')

type Status = 'FRESH' | 'STALE' | 'EXPIRED' | 'INVALID' | 'LEGACY'

interface Article {
  path: string
  id: string | null
  owner: string | null
  confidence: string | null
  reviewedAt: string | null
  ttlDays: number | null
  ageDays: number | null
  status: Status
  reason?: string
}

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
      now = new Date(argv[++i])
      if (Number.isNaN(now.getTime())) {
        console.error(`audit-kb-staleness: --now "${argv[i]}" is not a parseable date`)
        process.exit(2)
      }
    }
  }
  return { strict, json, now }
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
    if (s.isDirectory()) walk(full, out)
    else if (full.endsWith('.md')) out.push(full)
  }
}

function extractFrontmatter(src: string): Record<string, string> | null {
  if (!src.startsWith('---')) return null
  const end = src.indexOf('\n---', 3)
  if (end === -1) return null
  const block = src.slice(3, end).trim()
  const out: Record<string, string> = {}
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim()
    out[key] = value
  }
  return out
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null
  // YAML value may be bare (2026-04-22) or quoted. Strip quotes.
  const stripped = raw.replace(/^["']|["']$/g, '')
  const d = new Date(stripped)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseTtl(raw: string | null): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function classify(path: string, now: Date): Article {
  const rel = relative(ROOT, path).replace(/\\/g, '/')
  let src: string
  try {
    src = readFileSync(path, 'utf8')
  } catch (err) {
    return {
      path: rel, id: null, owner: null, confidence: null,
      reviewedAt: null, ttlDays: null, ageDays: null,
      status: 'INVALID', reason: `unreadable: ${(err as Error).message}`,
    }
  }
  const fm = extractFrontmatter(src)
  if (!fm) {
    return {
      path: rel, id: null, owner: null, confidence: null,
      reviewedAt: null, ttlDays: null, ageDays: null,
      status: 'INVALID', reason: 'no YAML frontmatter',
    }
  }
  // Pre-v0.1 SKILL.md domain roots use a different frontmatter
  // (`domain:` + `review_ttl: <date>` instead of `id:` +
  // `reviewed_at:` + `review_ttl_days:`). Classify as LEGACY so
  // they don't pollute the INVALID column; the owner migrates the
  // schema on touch.
  const isV01Schema = 'id' in fm || 'reviewed_at' in fm || 'review_ttl_days' in fm
  if (!isV01Schema) {
    return {
      path: rel,
      id: fm.domain ?? null,
      owner: fm.owner ?? null,
      confidence: fm.confidence ?? null,
      reviewedAt: fm.review_ttl ?? null,
      ttlDays: null,
      ageDays: null,
      status: 'LEGACY',
      reason: 'pre-v0.1 skill frontmatter — migrate to {id, reviewed_at, review_ttl_days}',
    }
  }
  const reviewedAt = parseDate(fm.reviewed_at ?? null)
  const ttlDays = parseTtl(fm.review_ttl_days ?? null)
  if (!reviewedAt || !ttlDays) {
    return {
      path: rel,
      id: fm.id ?? null,
      owner: fm.owner ?? null,
      confidence: fm.confidence ?? null,
      reviewedAt: fm.reviewed_at ?? null,
      ttlDays: ttlDays,
      ageDays: null,
      status: 'INVALID',
      reason: !reviewedAt ? 'missing/unparseable reviewed_at' : 'missing/invalid review_ttl_days',
    }
  }
  const ageMs = now.getTime() - reviewedAt.getTime()
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
  let status: Status = 'FRESH'
  if (ageDays > ttlDays * 2) status = 'EXPIRED'
  else if (ageDays > ttlDays) status = 'STALE'
  return {
    path: rel,
    id: fm.id ?? null,
    owner: fm.owner ?? null,
    confidence: fm.confidence ?? null,
    reviewedAt: fm.reviewed_at ?? null,
    ttlDays,
    ageDays,
    status,
  }
}

function main(): void {
  const { strict, json, now } = parseArgs()
  const files: string[] = []
  walk(SKILLS_DIR, files)
  const articles = files.map((f) => classify(f, now))
  articles.sort((a, b) => a.path.localeCompare(b.path))

  const counts = {
    FRESH: articles.filter((a) => a.status === 'FRESH').length,
    STALE: articles.filter((a) => a.status === 'STALE').length,
    EXPIRED: articles.filter((a) => a.status === 'EXPIRED').length,
    INVALID: articles.filter((a) => a.status === 'INVALID').length,
    LEGACY: articles.filter((a) => a.status === 'LEGACY').length,
  }
  const bad = counts.STALE + counts.EXPIRED + counts.INVALID

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: bad === 0,
          strict,
          now: now.toISOString().slice(0, 10),
          counts,
          articles,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`A-011 · KB freshness audit (${now.toISOString().slice(0, 10)})`)
    console.log(`Scanned: ${articles.length} articles under skills/`)
    console.log(`  FRESH:   ${counts.FRESH}`)
    console.log(`  STALE:   ${counts.STALE}`)
    console.log(`  EXPIRED: ${counts.EXPIRED}`)
    console.log(`  INVALID: ${counts.INVALID}`)
    console.log(`  LEGACY:  ${counts.LEGACY}  (pre-v0.1 frontmatter; informational)`)
    console.log('')
    for (const status of ['EXPIRED', 'STALE', 'INVALID'] as const) {
      const rows = articles.filter((a) => a.status === status)
      if (!rows.length) continue
      console.log(`${status}:`)
      for (const a of rows) {
        const ageLabel = a.ageDays !== null ? `${a.ageDays}d / ttl ${a.ttlDays}d` : a.reason ?? 'unknown'
        console.log(`  - ${a.path}  [${a.id ?? '?'} · owner ${a.owner ?? '?'}]  ${ageLabel}`)
      }
    }
    if (bad === 0) console.log('OK — every article is fresh.')
    else if (!strict) console.log(`(informational) ${bad} article(s) need attention.`)
    else console.error(`FAILED (--strict) — ${bad} article(s) need attention.`)
  }

  if (strict && bad > 0) process.exit(1)
  process.exit(0)
}

main()
