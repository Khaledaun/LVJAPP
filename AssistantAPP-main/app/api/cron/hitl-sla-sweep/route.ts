import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'

// Vercel Cron schedule: every 15 minutes (vercel.json · `*/15 * * * *`).
// 15 min is the tightest tier from D-013 (Critical business-hours SLA),
// so sweeping on that cadence catches every other tier (Urgent 1h,
// Standard 4h, Marketing 24h) on time with one handler.
//
// D-013 tier recap (set by `HITLApproval.slaDueAt` at creation):
//   - Standard  · 4h       · general advice review, routine outbound
//   - Urgent    · 1h       · `escalation.urgent_deadline`
//   - Critical  · 15min bh · `escalation.adverse_notice`,
//                            `escalation.criminal_history`
//   - Marketing · 24h      · all marketing content (D-010)
//
// The sweep doesn't discriminate — `HITLApproval.slaDueAt` already
// encodes the tier at creation time, so a single `WHERE slaDueAt <
// now AND status = PENDING` catches all four. Per-tier paging (off-
// hours for Critical) is a separate follow-up when pager integration
// lands; for now we flip status → EXPIRED and log the count. The
// downstream event bus + `/admin/approvals` queue surface what came
// out of the sweep.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const SKIP_DB = process.env.SKIP_DB === '1'

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    // SKIP_DB=1: dev loop — the sweep has nothing to operate on.
    if (SKIP_DB) {
      const body = {
        id: 'hitl.sla.sweep',
        path,
        correlationId,
        ok: true,
        expired: 0,
        skipped: 'SKIP_DB',
      }
      console.log(`[cron.hitl.sla.sweep] skipped SKIP_DB=1 correlationId=${correlationId}`)
      return NextResponse.json(body)
    }

    // Dynamic import so the route bundle doesn't drag Prisma in
    // when SKIP_DB is the hot path for tests.
    const { expireStale } = await import('@/lib/agents/hitl')
    try {
      const count = await expireStale()
      const body = {
        id: 'hitl.sla.sweep',
        path,
        correlationId,
        ok: true,
        expired: count,
      }
      console.log(
        `[cron.hitl.sla.sweep] correlationId=${correlationId} expired=${count}`,
      )
      return NextResponse.json(body)
    } catch (err) {
      console.error(`[cron.hitl.sla.sweep] failed correlationId=${correlationId}`, err)
      return NextResponse.json(
        {
          id: 'hitl.sla.sweep',
          path,
          correlationId,
          ok: false,
          error: 'sweep_failed',
          detail: String(err),
        },
        { status: 500 },
      )
    }
  })
}
