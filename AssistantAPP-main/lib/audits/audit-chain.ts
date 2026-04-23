/**
 * A-013 · Audit-chain completeness audit (PRD §5.5 target 100%).
 *
 * Static sweep: every `app/api/**` route that exports a
 * state-changing HTTP method (POST / PUT / PATCH / DELETE) MUST
 * either:
 *
 *   a) call `logAuditEvent(...)` somewhere in the same file, OR
 *   b) sit on the INTENTIONAL_NO_AUDIT allowlist below with a
 *      comment-level justification, OR
 *   c) be a STUB (no handler body) — matched by the A-002
 *      STUB_PATTERNS convention. Nothing to audit yet.
 *
 * Rule of thumb for the allowlist:
 *
 *   - Auth / session / NextAuth routes audit via NextAuth
 *     internals; not our concern.
 *   - Cron `/api/cron/*` routes are invoked by Vercel Cron with
 *     a CRON_SECRET bearer; their audit surface is the
 *     `correlationId` in the response + Vercel logs, not an
 *     AuditLog row per tick.
 *   - Webhook `/api/webhooks/*` routes rely on upstream signature
 *     verification + their own downstream writes for the audit
 *     trail.
 *   - Health / status routes don't mutate state.
 *
 * Blocking or informational? The plan §2.1 catalogue adds A-013
 * as a new audit id; we run it **informational at first** (CI
 * step with `continue-on-error`), monitor the violation count
 * for two weeks, then flip to blocking once every mutation-emitting
 * route has an explicit audit call or an allowlist entry. This
 * mirrors how A-003 started informational and went blocking in
 * Sprint 0.5.1.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const MUTATING_METHOD_RE =
  /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g

const AUDIT_CALL_RE =
  /\b(logAuditEvent|logAudit|prisma\.auditLog\.create|writeAudit)\s*\(/

const STUB_RE = /throw\s+new\s+Error\(['"]not[_-]?implemented|status:\s*501/i

// Relative to app/api/. Adding an entry means "this route's audit
// story lives elsewhere". Every entry needs a justification inline.
export const INTENTIONAL_NO_AUDIT: string[] = [
  // NextAuth internals.
  'auth/[...nextauth]/route.ts',
  'auth/bootstrap/route.ts',
  // Webhook ingress — HMAC verified; downstream writer audits.
  'webhooks/webflow/route.ts',
  // Cron handlers — audit surface is correlationId in the response
  // and Vercel logs; one AuditLog row per tick would be noise.
  'cron/audit-auth-weekly/route.ts',
  'cron/audit-tenant-nightly/route.ts',
  'cron/audit-jurisdiction-weekly/route.ts',
  'cron/audit-kb-staleness-weekly/route.ts',
  'cron/hitl-sla-sweep/route.ts',
  // Agent bootstrap — subscribes at process level; no tenant-
  // scoped mutation to audit. A bootstrap-audit row could land
  // when the orchestrator grows a tenant-scoped bootstrap path.
  'agents/bootstrap/route.ts',
  // Signup — happens before any user session exists; write path
  // audits via the User row creation itself (AuditLog.userId would
  // be null anyway).
  'signup/route.ts',
  // Terms acceptance — writes User.termsAcceptedAt; implicit audit
  // via the column timestamp. Worth revisiting when we formalise
  // the "consent changed" event stream.
  'terms/accept/route.ts',
]

export type Classification = 'AUDITED' | 'INTENTIONAL_NO_AUDIT' | 'STUB' | 'MISSING_AUDIT'

export interface Row {
  path: string
  mutatingMethods: string[]
  classification: Classification
  reason: string
}

export interface AuditChainResult {
  total: number
  rows: Row[]
  grouped: Record<Classification, Row[]>
  missing: Row[]
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
    else if (full.endsWith('route.ts') || full.endsWith('route.tsx')) out.push(full)
  }
}

function extractMutatingMethods(src: string): string[] {
  const out = new Set<string>()
  MUTATING_METHOD_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MUTATING_METHOD_RE.exec(src)) !== null) out.add(m[1])
  return [...out].sort()
}

function classify(filePath: string, apiDir: string): Row {
  const src = readFileSync(filePath, 'utf8')
  const rel = relative(apiDir, filePath).replace(/\\/g, '/')
  const mutatingMethods = extractMutatingMethods(src)

  if (mutatingMethods.length === 0) {
    return {
      path: rel,
      mutatingMethods: [],
      classification: 'AUDITED',
      reason: 'no mutating methods — nothing to audit',
    }
  }

  if (INTENTIONAL_NO_AUDIT.includes(rel)) {
    return {
      path: rel,
      mutatingMethods,
      classification: 'INTENTIONAL_NO_AUDIT',
      reason: 'allowlisted (audit story lives elsewhere)',
    }
  }

  if (STUB_RE.test(src)) {
    return {
      path: rel,
      mutatingMethods,
      classification: 'STUB',
      reason: 'stub / not-implemented — nothing to audit yet',
    }
  }

  if (AUDIT_CALL_RE.test(src)) {
    return {
      path: rel,
      mutatingMethods,
      classification: 'AUDITED',
      reason: 'logAuditEvent / logAudit / prisma.auditLog.create / writeAudit detected',
    }
  }

  return {
    path: rel,
    mutatingMethods,
    classification: 'MISSING_AUDIT',
    reason:
      'mutating handler but no audit call — add logAuditEvent(...) or justify via INTENTIONAL_NO_AUDIT',
  }
}

export function runAuditChain(opts: { root?: string } = {}): AuditChainResult {
  const root = opts.root ?? process.cwd()
  const apiDir = join(root, 'app', 'api')
  const files: string[] = []
  walk(apiDir, files)

  const rows = files.map((f) => classify(f, apiDir))
  const grouped: Record<Classification, Row[]> = {
    AUDITED: [],
    INTENTIONAL_NO_AUDIT: [],
    STUB: [],
    MISSING_AUDIT: [],
  }
  for (const r of rows) grouped[r.classification].push(r)
  const missing = grouped.MISSING_AUDIT

  return { total: rows.length, rows, grouped, missing }
}
