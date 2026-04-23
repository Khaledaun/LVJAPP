import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'
import { runAuditAuth } from '@/lib/audits/auth'

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
// TODO: when GITHUB_TOKEN is wired, dispatch('cron.audit.a002', …)
// so a subscriber opens one issue per violation. For now the
// correlationId on the response is the trail.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    const result = runAuditAuth()
    const ok = result.unauthed.length === 0
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
    }
    console.log(
      `[cron.audit.a002] ${ok ? 'ok' : 'FAIL'} correlationId=${correlationId} unauthed=${result.unauthed.length}`,
    )
    return NextResponse.json(summary)
  })
}
