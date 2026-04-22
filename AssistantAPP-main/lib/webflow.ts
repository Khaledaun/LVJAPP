// Sprint 0.7-bis · Marketing parallel track per D-019.
//
// Webflow Data API + webhook signature verification helpers.
//
// AD#12 (Claude.md v4.0) — "Webflow Data API via raw fetch() — no SDK.
// CMS create / update / publish + webhook receipt at
// /api/webhooks/webflow (HMAC-SHA256 verified with WEBFLOW_WEBHOOK_SECRET)."
//
// This module contains only the verification primitive and a small typed
// payload guard. Webflow Data API client + content-publish helpers land in
// Sprint 13 (Marketing Automation). The webhook receiver in
// app/api/webhooks/webflow/route.ts uses verifyWebhookSignature() to
// authenticate inbound requests (form submissions, content updates).

import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Webflow webhook signature. Webflow signs with HMAC-SHA256 over the
 * raw request body using `WEBFLOW_WEBHOOK_SECRET`. The signature arrives in
 * the `x-webflow-signature` (or legacy `x-webflow-webhook-signature`) header
 * as a lowercase hex string. Some payloads also include a timestamp header
 * (`x-webflow-timestamp`); when present it should be incorporated into the
 * signed string per Webflow's docs (`<timestamp>:<rawBody>`).
 *
 * Pass `rawBody` as a Buffer (not the parsed JSON) — JSON re-serialisation
 * changes byte ordering and breaks the signature. The route handler must
 * read `await request.text()` BEFORE calling JSON.parse.
 *
 * Returns true ONLY when:
 *   - secret is set,
 *   - signature is non-empty hex of expected length,
 *   - HMAC matches under timing-safe comparison.
 *
 * Never throws; callers respond 401 on false.
 */
export function verifyWebhookSignature(opts: {
  rawBody: string | Buffer
  signature: string | null | undefined
  timestamp?: string | null
  secret?: string
}): boolean {
  const secret = opts.secret ?? process.env.WEBFLOW_WEBHOOK_SECRET ?? ''
  if (!secret) return false
  if (!opts.signature || typeof opts.signature !== 'string') return false
  if (!/^[0-9a-f]+$/i.test(opts.signature)) return false

  const body = Buffer.isBuffer(opts.rawBody) ? opts.rawBody : Buffer.from(opts.rawBody, 'utf8')
  const signedString = opts.timestamp ? Buffer.concat([Buffer.from(`${opts.timestamp}:`, 'utf8'), body]) : body

  const expectedHex = createHmac('sha256', secret).update(signedString).digest('hex')
  const a = Buffer.from(expectedHex, 'hex')
  const b = Buffer.from(opts.signature.toLowerCase(), 'hex')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * The Webflow events we care about in v1. The receiver responds 202 to
 * any signed event (we don't want Webflow to retry on processing errors)
 * and routes asynchronously.
 */
export type WebflowEventType =
  | 'form_submission'
  | 'site_publish'
  | 'collection_item_created'
  | 'collection_item_changed'
  | 'collection_item_deleted'

export interface WebflowFormSubmissionPayload {
  triggerType: 'form_submission'
  payload: {
    name?: string
    siteId: string
    formId?: string
    data: Record<string, unknown>
    submittedAt?: string
  }
}

/**
 * Narrow guard. Returns the typed payload when the body is a recognised
 * Webflow form submission, otherwise null. Callers handle null by responding
 * 202 (we still ack the webhook) and logging an `audit.webflow.unknown_event`.
 */
export function asFormSubmission(body: unknown): WebflowFormSubmissionPayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (b.triggerType !== 'form_submission') return null
  const payload = b.payload as Record<string, unknown> | undefined
  if (!payload || typeof payload !== 'object') return null
  if (typeof payload.siteId !== 'string') return null
  if (!payload.data || typeof payload.data !== 'object') return null
  return body as WebflowFormSubmissionPayload
}
