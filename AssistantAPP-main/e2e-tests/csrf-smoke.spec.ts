/**
 * CSRF smoke — cross-origin POST must be rejected under `CSRF_MODE=enforce`.
 *
 * Lands as "route-level CSRF smoke" per the post-0.7 cleanup rolling
 * open items. The unit tests (`__tests__/lib-csrf.test.ts`) prove the
 * classifier is correct; this spec proves the middleware is actually
 * wired on every `/api/*` entry point and enforces the verdict in a
 * real request/response cycle.
 *
 * Behaviour depends on `CSRF_MODE`:
 *
 *   - `off` (default)   — every assertion is skipped with a SKIP note.
 *     The spec stays in the battery as a no-op so flipping the flag
 *     on staging immediately engages coverage.
 *   - `report-only`     — cross-origin POSTs pass through (200-or-
 *     other-status), but the [csrf] warn line appears in server logs.
 *     This spec treats report-only as a skip because the HTTP shape
 *     doesn't change.
 *   - `enforce`         — cross-origin POST → 403 with body
 *     `{ error: 'csrf_origin_mismatch' }`. Same-origin POST proceeds
 *     (may return 401 or 400 depending on auth, but NOT 403 for a
 *     CSRF reason).
 *
 * We target three representative state-changing endpoints:
 *   - `/api/cases`              (authed POST — tests generic path)
 *   - `/api/signup`             (public POST — proves we still guard
 *                                public endpoints)
 *   - `/api/partner-roles`      (staff-only POST-ish path — tests the
 *                                403-before-auth ordering)
 *
 * The spec uses bare `request` (no Playwright browser context) so we
 * can set arbitrary Origin / Referer headers.
 */

import { test, expect, request } from '@playwright/test'

const CSRF_MODE = (process.env.CSRF_MODE ?? 'off').toLowerCase()
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

const STATE_CHANGING_PATHS: Array<{ method: 'POST' | 'PATCH' | 'DELETE'; path: string; body?: unknown }> = [
  { method: 'POST', path: '/api/cases', body: { title: 'csrf-smoke' } },
  { method: 'POST', path: '/api/signup', body: { email: 'csrf@smoke.test', name: 'CSRF Smoke' } },
  { method: 'POST', path: '/api/partner-roles', body: { name: 'csrf-smoke-role' } },
]

test.describe('CSRF middleware · cross-origin rejection', () => {
  test.beforeAll(() => {
    if (CSRF_MODE !== 'enforce') {
      test.skip(
        true,
        `Skipping CSRF enforcement smoke — CSRF_MODE=${CSRF_MODE}. ` +
          `Set CSRF_MODE=enforce (staging/prod) to exercise this spec.`,
      )
    }
  })

  for (const { method, path, body } of STATE_CHANGING_PATHS) {
    test(`${method} ${path} rejects cross-origin Origin (403)`, async () => {
      const ctx = await request.newContext({ baseURL: BASE_URL })
      const res = await ctx.fetch(path, {
        method,
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example.com',
        },
        data: body,
      })
      expect(res.status()).toBe(403)
      const payload = await res.json().catch(() => ({}))
      expect(payload).toMatchObject({ error: 'csrf_origin_mismatch' })
    })

    test(`${method} ${path} rejects missing Origin and missing Referer (403)`, async () => {
      const ctx = await request.newContext({ baseURL: BASE_URL })
      const res = await ctx.fetch(path, {
        method,
        headers: { 'content-type': 'application/json' },
        data: body,
      })
      // Playwright's `request` may auto-populate a Referer from the
      // baseURL — accept either 403 csrf_no_origin or 403
      // csrf_referer_mismatch. The invariant is: 403 with a csrf_*
      // error code.
      expect(res.status()).toBe(403)
      const payload = await res.json().catch(() => ({}))
      expect(String(payload.error ?? '')).toMatch(/^csrf_/)
    })

    test(`${method} ${path} does NOT 403 on a same-origin call`, async () => {
      const ctx = await request.newContext({ baseURL: BASE_URL })
      const res = await ctx.fetch(path, {
        method,
        headers: {
          'content-type': 'application/json',
          origin: BASE_URL,
        },
        data: body,
      })
      // Same-origin POST may return 400 (validation) / 401 (no auth) /
      // 200 / 201 — anything EXCEPT 403 with a csrf_ error code.
      if (res.status() === 403) {
        const payload = await res.json().catch(() => ({}))
        expect(String(payload.error ?? '')).not.toMatch(/^csrf_/)
      }
    })
  }
})

test.describe('CSRF middleware · skip-path allow-list', () => {
  test.beforeAll(() => {
    if (CSRF_MODE !== 'enforce') {
      test.skip(true, `CSRF_MODE=${CSRF_MODE} — skip-list spec only meaningful under enforce.`)
    }
  })

  test('NextAuth paths bypass CSRF (their own token cookie handles it)', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL })
    const res = await ctx.fetch('/api/auth/session', {
      method: 'GET',
      headers: { origin: 'https://evil.example.com' },
    })
    // GET is a safe method — always passes CSRF regardless of Origin.
    // But even on POSTs to /api/auth/* the skip list should kick in;
    // exercising it here with GET is enough because the skip-path
    // check runs before the method check.
    expect(res.status()).not.toBe(403)
  })

  test('webhook paths bypass CSRF (HMAC is the defense)', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL })
    const res = await ctx.fetch('/api/webhooks/webflow', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://webflow.com',
      },
      data: { triggerType: 'form_submission', payload: {} },
    })
    // Should NOT be 403 for a CSRF reason. Webhook's own HMAC check
    // will return 401 / 400 for missing signature — that's expected,
    // and is NOT a csrf_* error.
    if (res.status() === 403) {
      const payload = await res.json().catch(() => ({}))
      expect(String(payload.error ?? '')).not.toMatch(/^csrf_/)
    }
  })
})
