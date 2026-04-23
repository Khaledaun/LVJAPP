import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'
import { runAuditJurisdiction } from '@/lib/audits/jurisdiction'

// Vercel Cron schedule: Sun 03:30 UTC (vercel.json · `30 3 * * 0`).
// Informational per EXECUTION_PLAN §2.1 — the body carries the hit
// count and per-term breakdown so a subscriber can decide what's
// actionable. We cap the `hits` array at 200 entries in the response
// to keep payloads small; the full list can always be reproduced by
// running the CLI.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_HITS_IN_RESPONSE = 200

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    const result = runAuditJurisdiction()
    const summary = {
      id: 'a004',
      path,
      correlationId,
      // Informational audit — never a hard fail; `ok: true` always.
      ok: true,
      totalFiles: result.totalFiles,
      totalHits: result.hits.length,
      nonAllowlistedHits: result.nonAllowlisted.length,
      perTerm: result.perTerm,
      sampleNonAllowlisted: result.nonAllowlisted.slice(0, MAX_HITS_IN_RESPONSE),
      truncated: result.nonAllowlisted.length > MAX_HITS_IN_RESPONSE,
    }
    console.log(
      `[cron.audit.a004] informational correlationId=${correlationId} ` +
        `nonAllowlisted=${result.nonAllowlisted.length}`,
    )
    return NextResponse.json(summary)
  })
}
