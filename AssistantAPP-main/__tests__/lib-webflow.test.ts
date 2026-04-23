/**
 * Sprint 0.7-bis · Marketing parallel track per D-019.
 *
 * Unit coverage for lib/webflow.ts. Validates C-009 (HMAC-verified
 * webhooks). No network, no Prisma, no next-auth.
 */

import { createHmac } from 'node:crypto'
import { asFormSubmission, verifyWebhookSignature } from '@/lib/webflow'

const SECRET = 'test-webflow-secret-not-used-in-prod'

function sign(body: string, secret = SECRET, timestamp?: string): string {
  const signed = timestamp ? `${timestamp}:${body}` : body
  return createHmac('sha256', secret).update(signed).digest('hex')
}

describe('lib/webflow · verifyWebhookSignature', () => {
  it('accepts a valid body-only signature', () => {
    const body = JSON.stringify({ triggerType: 'form_submission' })
    const sig = sign(body)
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, secret: SECRET })).toBe(true)
  })

  it('accepts a valid timestamp-prefixed signature', () => {
    const body = JSON.stringify({ triggerType: 'form_submission' })
    const ts = '2026-04-22T17:00:00Z'
    const sig = sign(body, SECRET, ts)
    expect(
      verifyWebhookSignature({ rawBody: body, signature: sig, timestamp: ts, secret: SECRET }),
    ).toBe(true)
  })

  it('rejects when secret is missing', () => {
    const body = '{}'
    const sig = sign(body)
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, secret: '' })).toBe(false)
  })

  it('rejects when signature header is missing', () => {
    expect(verifyWebhookSignature({ rawBody: '{}', signature: null, secret: SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: '{}', signature: undefined, secret: SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: '{}', signature: '', secret: SECRET })).toBe(false)
  })

  it('rejects non-hex signature input', () => {
    expect(verifyWebhookSignature({ rawBody: '{}', signature: 'not-hex-zzz', secret: SECRET })).toBe(false)
  })

  it('rejects a forged signature (wrong secret)', () => {
    const body = JSON.stringify({ triggerType: 'form_submission' })
    const sig = sign(body, 'wrong-secret')
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, secret: SECRET })).toBe(false)
  })

  it('rejects when body has been tampered with', () => {
    const body = JSON.stringify({ triggerType: 'form_submission' })
    const sig = sign(body)
    const tampered = body.replace('form_submission', 'site_publish')
    expect(verifyWebhookSignature({ rawBody: tampered, signature: sig, secret: SECRET })).toBe(false)
  })

  it('rejects when timestamp prefix differs', () => {
    const body = '{"x":1}'
    const sig = sign(body, SECRET, '2026-04-22T17:00:00Z')
    expect(
      verifyWebhookSignature({ rawBody: body, signature: sig, timestamp: '2026-04-22T17:00:01Z', secret: SECRET }),
    ).toBe(false)
  })

  it('uppercased hex matches lowercased expected', () => {
    const body = '{"x":1}'
    const sig = sign(body).toUpperCase()
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, secret: SECRET })).toBe(true)
  })

  it('Buffer body works identically to string', () => {
    const bodyStr = JSON.stringify({ triggerType: 'form_submission' })
    const sig = sign(bodyStr)
    expect(
      verifyWebhookSignature({ rawBody: Buffer.from(bodyStr, 'utf8'), signature: sig, secret: SECRET }),
    ).toBe(true)
  })
})

describe('lib/webflow · asFormSubmission', () => {
  it('returns the typed payload for a real form_submission body', () => {
    const body = {
      triggerType: 'form_submission',
      payload: {
        siteId: 'site-1',
        formId: 'form-1',
        data: { email: 'a@b.com', name: 'Anon Smoke' },
      },
    }
    const r = asFormSubmission(body)
    expect(r).not.toBeNull()
    expect(r!.payload.siteId).toBe('site-1')
  })

  it('returns null for non-form-submission events', () => {
    expect(asFormSubmission({ triggerType: 'site_publish', payload: {} })).toBeNull()
    expect(asFormSubmission({ triggerType: 'collection_item_created', payload: {} })).toBeNull()
  })

  it('returns null for malformed payloads', () => {
    expect(asFormSubmission(null)).toBeNull()
    expect(asFormSubmission(undefined)).toBeNull()
    expect(asFormSubmission({})).toBeNull()
    expect(asFormSubmission({ triggerType: 'form_submission' })).toBeNull()
    expect(asFormSubmission({ triggerType: 'form_submission', payload: { siteId: 'x' } })).toBeNull()
    expect(asFormSubmission({ triggerType: 'form_submission', payload: { data: {} } })).toBeNull()
  })
})
