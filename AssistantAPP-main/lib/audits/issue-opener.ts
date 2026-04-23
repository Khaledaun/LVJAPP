/**
 * Cron audit issue opener.
 *
 * Called from every `/api/cron/audit-*` handler whenever the audit
 * finds something worth tracking. Opens (or updates, if a matching
 * open issue already exists) one GitHub issue per finding.
 *
 * Staged rollout, same shape as the CSRF / rate-limit middleware:
 *
 *   - `GITHUB_TOKEN` unset          — `openAuditIssue` logs
 *                                     `[issue-opener] would open: …`
 *                                     and returns
 *                                     `{ opened: false, reason:
 *                                     'no_token' }`. Safe default.
 *   - `GITHUB_TOKEN` set, `GITHUB_ISSUE_OPENER_MODE=dry`  — same
 *                                     as above; explicit dry-run
 *                                     for staging before the real
 *                                     flip.
 *   - `GITHUB_TOKEN` set, default   — POST to
 *                                     `https://api.github.com/repos/<owner>/<repo>/issues`.
 *                                     Idempotency: we GET `/issues?
 *                                     state=open&labels=cron-audit,<audit-id>`
 *                                     and reuse the first match's
 *                                     number; the audit handler posts
 *                                     a comment instead of opening a
 *                                     duplicate.
 *
 * Scope note: intentionally minimal. No retry / no backoff / no rate-
 * limit handling — a cron runs once a week, the blast radius on
 * failure is "no issue opened this week", and the next cron run
 * covers it. If that proves wrong, promote to `@octokit/rest` and
 * put this behind a real circuit breaker.
 */

export interface AuditIssueInput {
  /** Audit id, e.g. 'a002', 'a003', 'a004', 'a011'. Used as a label and in the title prefix. */
  auditId: string
  /** Short one-line title, e.g. `"UNAUTHED route: app/api/x/route.ts"`. */
  title: string
  /** Markdown issue body. Include reproducer, ownership, severity. */
  body: string
  /** Labels to add; `cron-audit` + `<auditId>` are always included. */
  extraLabels?: string[]
  /** GitHub handle(s) to assign — typically from the article `owner` frontmatter for A-011. */
  assignees?: string[]
  /** Correlation id of the cron run that produced the finding — stamped in the body. */
  correlationId: string
}

export type IssueOpenerResult =
  | { opened: true; number: number; url: string }
  | { opened: false; reason: 'no_token' | 'dry_run' | 'duplicate' | 'api_error'; detail?: string }

function repoSlug(): { owner: string; repo: string } | null {
  const slug =
    process.env.GITHUB_REPOSITORY ??
    process.env.CRON_ISSUE_OPENER_REPO ??
    ''
  const match = /^([^/]+)\/([^/]+)$/.exec(slug)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

function modeIsDry(): boolean {
  return (process.env.GITHUB_ISSUE_OPENER_MODE ?? '').toLowerCase() === 'dry'
}

export async function openAuditIssue(input: AuditIssueInput): Promise<IssueOpenerResult> {
  const token = process.env.GITHUB_TOKEN ?? ''
  const slug = repoSlug()

  if (!token || !slug) {
    console.log(
      `[issue-opener] would open: [${input.auditId}] ${input.title} ` +
        `(correlationId=${input.correlationId}; reason=${!token ? 'no_token' : 'no_repo'})`,
    )
    return { opened: false, reason: 'no_token', detail: !token ? 'GITHUB_TOKEN unset' : 'GITHUB_REPOSITORY unset' }
  }
  if (modeIsDry()) {
    console.log(
      `[issue-opener] dry-run: [${input.auditId}] ${input.title} (correlationId=${input.correlationId})`,
    )
    return { opened: false, reason: 'dry_run' }
  }

  const baseHeaders = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
  }
  const labels = ['cron-audit', input.auditId, ...(input.extraLabels ?? [])]

  // Dedupe by (auditId + title) among open issues carrying our labels.
  try {
    const searchUrl =
      `https://api.github.com/repos/${slug.owner}/${slug.repo}/issues?` +
      `state=open&labels=${encodeURIComponent(`cron-audit,${input.auditId}`)}&per_page=100`
    const searchRes = await fetch(searchUrl, { headers: baseHeaders })
    if (searchRes.ok) {
      const existing = (await searchRes.json()) as Array<{ number: number; title: string; html_url: string }>
      const hit = existing.find((i) => i.title === input.title)
      if (hit) {
        // Append a comment instead of opening a duplicate; return the existing number.
        await fetch(
          `https://api.github.com/repos/${slug.owner}/${slug.repo}/issues/${hit.number}/comments`,
          {
            method: 'POST',
            headers: { ...baseHeaders, 'content-type': 'application/json' },
            body: JSON.stringify({
              body: [
                `**Re-surfaced by ${input.auditId} cron** at ${new Date().toISOString()}`,
                `correlationId=\`${input.correlationId}\``,
                '',
                input.body,
              ].join('\n'),
            }),
          },
        ).catch((err) => {
          console.error(`[issue-opener] failed to append comment to #${hit.number}:`, err)
        })
        return { opened: false, reason: 'duplicate', detail: `existing #${hit.number}` }
      }
    } else {
      console.error(`[issue-opener] search failed: ${searchRes.status} ${await searchRes.text()}`)
    }
  } catch (err) {
    console.error('[issue-opener] search threw:', err)
  }

  try {
    const body =
      input.body +
      `\n\n---\n<sub>Opened by cron audit \`${input.auditId}\` · correlationId=\`${input.correlationId}\`</sub>`
    const createRes = await fetch(
      `https://api.github.com/repos/${slug.owner}/${slug.repo}/issues`,
      {
        method: 'POST',
        headers: { ...baseHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          body,
          labels,
          assignees: input.assignees ?? [],
        }),
      },
    )
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '<no body>')
      console.error(`[issue-opener] create failed: ${createRes.status} ${text}`)
      return { opened: false, reason: 'api_error', detail: `${createRes.status}: ${text.slice(0, 200)}` }
    }
    const issue = (await createRes.json()) as { number: number; html_url: string }
    console.log(
      `[issue-opener] opened #${issue.number} for [${input.auditId}] ${input.title} (${issue.html_url})`,
    )
    return { opened: true, number: issue.number, url: issue.html_url }
  } catch (err) {
    console.error('[issue-opener] create threw:', err)
    return { opened: false, reason: 'api_error', detail: String(err) }
  }
}
