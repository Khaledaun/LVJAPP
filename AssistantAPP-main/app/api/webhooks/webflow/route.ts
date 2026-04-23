// POST /api/webhooks/webflow
//
// Sprint 0.7-bis · Marketing parallel track per D-019.
//
// Inbound webhook receiver for Webflow form submissions and CMS events.
// HMAC-SHA256 signature is verified against WEBFLOW_WEBHOOK_SECRET (C-009).
// Per AD#12 (Claude.md v4.0) we use raw fetch() and accept the payload
// here; routing to MarketingLead happens in Sprint 13 once the
// MarketingLead model lands (Sprint 0.5 prereq for tenantId scoping).
//
// The receiver always responds 202 to a *valid* event so Webflow does
// not retry on transient processing failures. Bad signatures get 401.
// Unknown events get 202 + an audit row; persisted analysis happens
// later.
//
// This route is on the INTENTIONAL_PUBLIC allowlist of A-002
// (scripts/audit-auth.ts) — its authentication boundary is the HMAC
// signature, not a session cookie.

import { NextResponse, type NextRequest } from 'next/server'
import { asFormSubmission, verifyWebhookSignature } from '@/lib/webflow'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const SIG_HEADERS = ['x-webflow-signature', 'x-webflow-webhook-signature'] as const

export async function POST(req: NextRequest): Promise<Response> {
  // Read body as raw text first — JSON parsing changes byte order and
  // would break the HMAC.
  const rawBody = await req.text()
  const headers = req.headers

  let signature: string | null = null
  for (const name of SIG_HEADERS) {
    const v = headers.get(name)
    if (v) { signature = v; break }
  }
  const timestamp = headers.get('x-webflow-timestamp')

  // Try with timestamp first (newer Webflow contract); fall back to
  // body-only (legacy).
  const ok =
    verifyWebhookSignature({ rawBody, signature, timestamp }) ||
    verifyWebhookSignature({ rawBody, signature })

  if (!ok) {
    // Audit the rejection so brute-force attempts surface in A-002 review.
    await safeAudit('webflow.webhook.rejected_bad_signature', {
      hasSignature: !!signature,
      timestampPresent: !!timestamp,
      bytes: rawBody.length,
    })
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let parsed: unknown = null
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null
  } catch {
    await safeAudit('webflow.webhook.malformed_json', { bytes: rawBody.length })
    // Signature was valid; we still 202 to avoid retries, but the audit
    // row tells us to fix the upstream config.
    return NextResponse.json({ ok: true, ignored: 'malformed_json' }, { status: 202 })
  }

  const formSubmission = asFormSubmission(parsed)
  if (formSubmission) {
    // Sprint 13 (Marketing Automation) will route this into MarketingLead.
    // Sprint 0.5 must land first because MarketingLead carries tenantId.
    // For now: audit the receipt and return.
    await safeAudit('webflow.webhook.form_submission_accepted', {
      siteId: formSubmission.payload.siteId,
      formId: formSubmission.payload.formId ?? null,
      // never log the full data block (PII risk per docs/EXECUTION_PLAN §7.4)
      dataKeys: Object.keys(formSubmission.payload.data ?? {}),
    })
    return NextResponse.json(
      { ok: true, received: 'form_submission', deferred: 'MarketingLead-create-pending-Sprint-0.5' },
      { status: 202 },
    )
  }

  // Recognised top-level shape but unsupported event type.
  const triggerType =
    parsed && typeof parsed === 'object' && 'triggerType' in (parsed as Record<string, unknown>)
      ? String((parsed as Record<string, unknown>).triggerType)
      : null
  await safeAudit('webflow.webhook.unsupported_event', { triggerType })
  return NextResponse.json({ ok: true, ignored: 'unsupported_event' }, { status: 202 })
}

async function safeAudit(action: string, diff: Record<string, unknown>): Promise<void> {
  try {
    // Webhook ingress has no caseId / userId yet — those are stamped when
    // the payload routes into MarketingLead in Sprint 13.
    await logAuditEvent(null, null, action, diff)
  } catch {
    // Never let an audit failure break the webhook response. The audit
    // backend may be down (no DB in sandbox); the webhook still acks.
  }
}
