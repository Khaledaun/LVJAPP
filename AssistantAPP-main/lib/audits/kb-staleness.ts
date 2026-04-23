/**
 * A-011 · KB freshness audit — library.
 *
 * Pure logic. The CLI wrapper is `scripts/audit-kb-staleness.ts`;
 * the weekly cron handler (`app/api/cron/audit-kb-staleness-weekly/
 * route.ts`) calls the same `runAuditKbStaleness` entry point.
 *
 * Classification rules are documented in `scripts/audit-kb-
 * staleness.ts`. See D-026 for the renumbering history.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export type Status = 'FRESH' | 'STALE' | 'EXPIRED' | 'INVALID' | 'LEGACY'

export interface Article {
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

export interface AuditKbStalenessResult {
  now: string
  total: number
  counts: Record<Status, number>
  articles: Article[]
  /** Count of status entries considered "bad" (STALE + EXPIRED + INVALID). */
  badCount: number
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
  const stripped = raw.replace(/^["']|["']$/g, '')
  const d = new Date(stripped)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseTtl(raw: string | null): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function classifyArticle(filePath: string, now: Date, root: string): Article {
  const rel = relative(root, filePath).replace(/\\/g, '/')
  let src: string
  try {
    src = readFileSync(filePath, 'utf8')
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
  // `reviewed_at:` + `review_ttl_days:`). Classify as LEGACY so they
  // don't pollute INVALID; the owner migrates on touch.
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

export interface RunAuditKbStalenessOptions {
  /** Project root; defaults to `process.cwd()`. */
  root?: string
  /** Clock override for deterministic testing. */
  now?: Date
}

export function runAuditKbStaleness(
  opts: RunAuditKbStalenessOptions = {},
): AuditKbStalenessResult {
  const root = opts.root ?? process.cwd()
  const now = opts.now ?? new Date()
  const skillsDir = join(root, 'skills')
  const files: string[] = []
  walk(skillsDir, files)

  const articles = files.map((f) => classifyArticle(f, now, root))
  articles.sort((a, b) => a.path.localeCompare(b.path))

  const counts: Record<Status, number> = {
    FRESH: 0, STALE: 0, EXPIRED: 0, INVALID: 0, LEGACY: 0,
  }
  for (const a of articles) counts[a.status] += 1
  const badCount = counts.STALE + counts.EXPIRED + counts.INVALID

  return {
    now: now.toISOString().slice(0, 10),
    total: articles.length,
    counts,
    articles,
    badCount,
  }
}
