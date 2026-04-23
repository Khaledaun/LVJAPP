/**
 * `runCron(req, cb)` — the guard for `/api/cron/*` handlers.
 *
 * The contract, per SESSION_NOTES pass-2 item 9 and
 * docs/xrepo/khaledaunsite/04-security-and-compliance.md:
 *
 *   - Every `/api/cron/<id>/route.ts` handler wraps its body in
 *     `runCron(req, async () => { ... })`.
 *   - The helper rejects with 401 if the incoming request doesn't
 *     carry `Authorization: Bearer ${CRON_SECRET}`.
 *   - Vercel Cron calls with exactly that header, so no route-level
 *     special case is needed for the production invocation.
 *   - A-002 (`scripts/audit-auth.ts`) treats `runCron` as a guard
 *     helper — cron routes using this pattern count as GUARDED and
 *     stay out of the `INTENTIONAL_PUBLIC` allowlist.
 *
 * In dev / CI (`SKIP_AUTH=1`, `SKIP_DB=1`, or `CRON_SECRET` unset
 * AND `NODE_ENV !== 'production'`), the bearer check is skipped so
 * local runs and smoke tests don't need a secret configured. In
 * production a missing `CRON_SECRET` is a hard 500 — we refuse to
 * execute rather than silently allow.
 *
 * Usage:
 *
 *     // app/api/cron/audit-tenant-nightly/route.ts
 *     import { runCron } from '@/lib/cron'
 *     export const dynamic = 'force-dynamic'
 *     export const revalidate = 0
 *     export async function GET(req: Request) {
 *       return runCron(req, async ({ correlationId }) => {
 *         // ... audit work; emit `cron.audit.a003` event.
 *         return NextResponse.json({ ok: true, correlationId })
 *       })
 *     }
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

export interface CronContext {
  /** UUIDv4 per invocation; propagate into every emitted event/log row. */
  correlationId: string
  /** The cron path, e.g. `/api/cron/audit-tenant-nightly`. */
  path: string
}

export type CronHandler = (ctx: CronContext) => Promise<Response>

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function shouldSkipAuth(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.SKIP_AUTH === '1' || process.env.SKIP_DB === '1'
}

export async function runCron(req: Request, handler: CronHandler): Promise<Response> {
  const url = new URL(req.url)
  const ctx: CronContext = {
    correlationId: randomUUID(),
    path: url.pathname,
  }

  const secret = process.env.CRON_SECRET ?? ''

  if (!shouldSkipAuth()) {
    if (!secret) {
      // Hard fail in prod: no secret configured but a cron call hit us.
      // Returning 500 (not 401) so an infra misconfiguration pages an
      // operator instead of being mistaken for a caller authentication
      // error that gets retried.
      return NextResponse.json(
        { ok: false, error: 'cron_misconfigured' },
        { status: 500, headers: { 'X-Correlation-Id': ctx.correlationId } },
      )
    }

    const authHeader = req.headers.get('authorization') ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(authHeader)
    const presented = match?.[1] ?? ''
    if (!presented || !constantTimeEqual(presented, secret)) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized' },
        { status: 401, headers: { 'X-Correlation-Id': ctx.correlationId } },
      )
    }
  }

  try {
    const res = await handler(ctx)
    // Stamp correlation id on the response if the handler didn't.
    if (!res.headers.get('X-Correlation-Id')) {
      res.headers.set('X-Correlation-Id', ctx.correlationId)
    }
    return res
  } catch (err) {
    console.error(`[cron] ${ctx.path} threw`, { correlationId: ctx.correlationId, err })
    return NextResponse.json(
      { ok: false, error: 'cron_failed' },
      { status: 500, headers: { 'X-Correlation-Id': ctx.correlationId } },
    )
  }
}
