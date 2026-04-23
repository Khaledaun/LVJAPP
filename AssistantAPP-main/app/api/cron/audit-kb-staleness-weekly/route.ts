import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'
import { runAuditKbStaleness } from '@/lib/audits/kb-staleness'

// Vercel Cron schedule: Mon 03:00 UTC (vercel.json · `0 3 * * 1`).
// A-011 is informational — response always `ok: true`. The weekly
// run surfaces STALE / EXPIRED / INVALID counts so the per-article
// issue opener (wired later, when GITHUB_TOKEN lands) can bucket
// assignments to `owner` from each article's frontmatter.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    const result = runAuditKbStaleness()
    const summary = {
      id: 'a011',
      path,
      correlationId,
      ok: true, // informational
      now: result.now,
      total: result.total,
      counts: result.counts,
      badCount: result.badCount,
      // Full article list included — there are ~30 KB files, payload
      // is small. Issue opener reads `status` per row and decides.
      articles: result.articles,
    }
    console.log(
      `[cron.audit.a011] informational correlationId=${correlationId} ` +
        `fresh=${result.counts.FRESH} stale=${result.counts.STALE} ` +
        `expired=${result.counts.EXPIRED} invalid=${result.counts.INVALID} ` +
        `legacy=${result.counts.LEGACY}`,
    )
    return NextResponse.json(summary)
  })
}
