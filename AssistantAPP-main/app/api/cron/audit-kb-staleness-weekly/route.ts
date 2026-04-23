import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'
import { runAuditKbStaleness, type Article } from '@/lib/audits/kb-staleness'
import { openAuditIssue, type IssueOpenerResult } from '@/lib/audits/issue-opener'

// Vercel Cron schedule: Mon 03:00 UTC (vercel.json · `0 3 * * 1`).
// A-011 is informational — response always `ok: true`. The weekly
// run surfaces STALE / EXPIRED / INVALID counts and opens one issue
// per article in those buckets via `lib/audits/issue-opener.ts`.
// Without `GITHUB_TOKEN` the opener runs in log-only mode; wiring
// real handles to `owner` slugs stays deferred until an
// owner → GitHub-handle map is captured (new rolling item).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function titleFor(a: Article): string {
  return `[a011] ${a.status} KB article: ${a.id ?? a.path}`
}

function bodyFor(a: Article): string {
  const lines = [
    `**Article.** \`${a.path}\``,
    `**Id:** \`${a.id ?? '(missing)'}\``,
    `**Owner (frontmatter):** ${a.owner ?? '(missing)'}`,
    `**Confidence:** ${a.confidence ?? '(missing)'}`,
    `**Status:** **${a.status}**`,
  ]
  if (a.reviewedAt) lines.push(`**Reviewed at:** ${a.reviewedAt}`)
  if (a.ttlDays !== null) lines.push(`**TTL (days):** ${a.ttlDays}`)
  if (a.ageDays !== null) lines.push(`**Age (days):** ${a.ageDays}`)
  if (a.reason) lines.push(`**Reason:** ${a.reason}`)
  lines.push('')
  if (a.status === 'STALE') {
    lines.push(
      'Refresh the article body and bump `reviewed_at:` in the ' +
        'frontmatter to today. No confidence downgrade — `STALE` is a ' +
        'nudge, not a demotion.',
    )
  } else if (a.status === 'EXPIRED') {
    lines.push(
      'Article has exceeded `2× review_ttl_days`. Per AGENT_OS §6.4 it ' +
        'auto-demotes `authoritative` → `draft`. Update the body, then ' +
        'flip `confidence:` and `reviewed_at:` together.',
    )
  } else {
    lines.push(
      'Frontmatter is missing or malformed. Fix the YAML block so the ' +
        'audit can classify the article; see `skills/core/disclaimers/ ' +
        'upl.md` for the canonical v0.1 shape.',
    )
  }
  return lines.join('\n')
}

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    // `?now=YYYY-MM-DD` lets staff replay a past-dated audit for
    // testing the issue-opener output without waiting for the
    // weekly schedule. Vercel cron never sets it.
    const url = new URL(req.url)
    const nowParam = url.searchParams.get('now')
    const now = nowParam ? new Date(nowParam) : undefined
    if (nowParam && (!now || Number.isNaN(now.getTime()))) {
      return NextResponse.json(
        { ok: false, error: 'invalid_now', detail: `?now=${nowParam} is not a parseable date` },
        { status: 400 },
      )
    }
    const result = runAuditKbStaleness({ now })

    // Open issues for every non-FRESH, non-LEGACY article. LEGACY is
    // informational (pre-v0.1 frontmatter); pinging an owner every
    // week about that is noise. LEGACY surfaces in the response body
    // so operators can triage them out-of-band.
    const issues: IssueOpenerResult[] = []
    for (const article of result.articles) {
      if (article.status === 'FRESH' || article.status === 'LEGACY') continue
      const res = await openAuditIssue({
        auditId: 'a011',
        title: titleFor(article),
        body: bodyFor(article),
        extraLabels: ['audit-a011', article.status.toLowerCase()],
        // `owner` is a role slug (e.g. `founding-engineer`,
        // `platform-marketing`), not a GitHub handle. Leaving
        // `assignees` empty until an owner → handle map exists.
        correlationId,
      })
      issues.push(res)
    }

    const summary = {
      id: 'a011',
      path,
      correlationId,
      ok: true, // informational
      now: result.now,
      total: result.total,
      counts: result.counts,
      badCount: result.badCount,
      articles: result.articles,
      issues,
    }
    console.log(
      `[cron.audit.a011] informational correlationId=${correlationId} ` +
        `fresh=${result.counts.FRESH} stale=${result.counts.STALE} ` +
        `expired=${result.counts.EXPIRED} invalid=${result.counts.INVALID} ` +
        `legacy=${result.counts.LEGACY} issuesOpened=${issues.filter((i) => i.opened).length}`,
    )
    return NextResponse.json(summary)
  })
}
