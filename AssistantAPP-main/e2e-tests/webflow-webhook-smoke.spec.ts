/**
 * S-009 · Webflow webhook signature smoke (Sprint 0.7-bis · D-019)
 *
 * Asserts:
 *   - POST without a signature header → 401.
 *   - POST with a forged signature → 401.
 *   - POST with a valid signature → 202 Accepted.
 *   - POST with valid signature + unsupported event → 202 (still acked).
 *   - POST with valid signature + malformed JSON → 202 (still acked).
 *
 * The smoke does NOT touch Prisma; the route currently defers
 * MarketingLead creation to Sprint 13 once Sprint 0.5 lands. A future
 * extension (post-Sprint-13) asserts the row insertion.
 */

import { test, expect } from '@playwright/test'
import { createHmac } from 'node:crypto'

const SECRET = process.env.WEBFLOW_WEBHOOK_SECRET || 'test-webflow-secret-not-used-in-prod'

function sign(rawBody: string, timestamp?: string): string {
  const signed = timestamp ? `${timestamp}:${rawBody}` : rawBody
  return createHmac('sha256', SECRET).update(signed).digest('hex')
}

const FORM_BODY = JSON.stringify({
  triggerType: 'form_submission',
  payload: {
    siteId: 'site-smoke',
    formId: 'form-smoke',
    data: { email: 'anon@smoke.example', name: 'Anon Smoke' },
  },
})

test.describe('S-009 · Webflow webhook signature', () => {
  test('rejects POST without signature → 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/webflow', {
      data: FORM_BODY,
      headers: { 'content-type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('rejects POST with forged signature → 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/webflow', {
      data: FORM_BODY,
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': createHmac('sha256', 'wrong-secret').update(FORM_BODY).digest('hex'),
      },
    })
    expect(res.status()).toBe(401)
  })

  test('accepts POST with valid signature → 202', async ({ request }) => {
    const res = await request.post('/api/webhooks/webflow', {
      data: FORM_BODY,
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': sign(FORM_BODY),
      },
    })
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, received: 'form_submission' })
  })

  test('accepts valid signature + timestamp prefix → 202', async ({ request }) => {
    const ts = '2026-04-22T17:00:00Z'
    const res = await request.post('/api/webhooks/webflow', {
      data: FORM_BODY,
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': sign(FORM_BODY, ts),
        'x-webflow-timestamp': ts,
      },
    })
    expect(res.status()).toBe(202)
  })

  test('valid signature + unsupported event → 202 with ignored marker', async ({ request }) => {
    const body = JSON.stringify({ triggerType: 'site_publish', payload: { siteId: 'site-1' } })
    const res = await request.post('/api/webhooks/webflow', {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': sign(body),
      },
    })
    expect(res.status()).toBe(202)
    const r = await res.json()
    expect(r.ok).toBe(true)
    expect(r.ignored).toBeDefined()
  })

  test('valid signature + malformed JSON → 202 with malformed_json marker', async ({ request }) => {
    const body = '{not-json'
    const res = await request.post('/api/webhooks/webflow', {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': sign(body),
      },
    })
    expect(res.status()).toBe(202)
    const r = await res.json()
    expect(r.ignored).toBe('malformed_json')
  })

  test('response body must NOT leak the verified payload back to the caller', async ({ request }) => {
    // Defence-in-depth: signing implies trust, but the response is public —
    // never echo the signed payload (PII / secrets risk).
    const res = await request.post('/api/webhooks/webflow', {
      data: FORM_BODY,
      headers: {
        'content-type': 'application/json',
        'x-webflow-signature': sign(FORM_BODY),
      },
    })
    const txt = await res.text()
    expect(txt).not.toContain('anon@smoke.example')
    expect(txt).not.toContain('Anon Smoke')
  })
})
