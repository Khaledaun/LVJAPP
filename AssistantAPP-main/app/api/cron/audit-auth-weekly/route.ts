import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'
import { runAuditAuth } from '@/lib/audits/auth'
import { openAuditIssue, type IssueOpenerResult } from '@/lib/audits/issue-opener'

// Vercel Cron schedule: Mon 03:00 UTC (vercel.json · `0 3 * * 0`).
// Guarded by CRON_SECRET bearer via runCron; stays off the A-002
// INTENTIONAL_PUBLIC allowlist.
//
// Behaviour: run the A-002 classifier, return a JSON summary, always
// HTTP 200 (even on audit failure) — a non-empty `violations` array
// is the fail signal, not the status code. Using 500 would make
// Vercel retry the cron, which doesn't help since the audit result
// is deterministic on the same deploy; the response body is what a
// downstream issue-opener consumes.
//
// Each UNAUTHED route opens (or re-surfaces, if already tracked) a
// dedicated `[a002] UNAUTHED route: …` GitHub issue via
// `lib/audits/issue-opener.ts`. Without `GITHUB_TOKEN` set, the
// opener logs `[issue-opener] would open: …` and returns — safe to
// deploy with the flag unset.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    const result = runAuditAuth()
    const ok = result.unauthed.length === 0

    const issues: IssueOpenerResult[] = []
    for (const row of result.unauthed) {
      const res = await openAuditIssue({
        auditId: 'a002',
        title: `[a002] UNAUTHED route: ${row.path}`,
        body: [
          '**Finding.** `' + row.path + '` classifies as UNAUTHED per `scripts/audit-auth.ts`.',
          '',
          `**Methods:** ${row.methods.join(', ') || '(none)'}`,
          `**Reason:** ${row.reason}`,
          '',
          'Guard the handler with one of:',
          '- `runAuthed(kind, handler)` (preferred — composes tenant scope)',
          '- `guardStaff()` / `guardCaseAccess(id)` / `guardOrgAccess(id)` / `guardAuthed()`',
          '',
          'Sev-1 per `docs/EXECUTION_PLAN.md` §4.1. Re-run the cron after merging the fix; this issue auto-closes nothing — a human confirms.',
        ].join('\n'),
        extraLabels: ['sev-1', 'audit-a002'],
        correlationId,
      })
      issues.push(res)
    }

    const summary = {
      id: 'a002',
      path,
      correlationId,
      ok,
      total: result.total,
      counts: {
        guarded: result.grouped.GUARDED.length,
        intentionalPublic: result.grouped.INTENTIONAL_PUBLIC.length,
        stub: result.grouped.STUB.length,
        unauthed: result.unauthed.length,
      },
      violations: result.unauthed.map((r) => ({
        path: r.path,
        methods: r.methods,
        reason: r.reason,
      })),
      issues,
    }
    console.log(
      `[cron.audit.a002] ${ok ? 'ok' : 'FAIL'} correlationId=${correlationId} ` +
        `unauthed=${result.unauthed.length} issuesOpened=${issues.filter((i) => i.opened).length}`,
    )
    return NextResponse.json(summary)
  })
}
