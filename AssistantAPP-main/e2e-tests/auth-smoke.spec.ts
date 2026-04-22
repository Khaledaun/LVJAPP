/**
 * S-003 · Adversarial auth smoke
 *
 * Every route below was flagged UNAUTHED in the Phase 0 audit (PR #8)
 * and wrapped with an auth helper in Sprint 0.1. This spec hits each
 * with NO session and asserts a non-2xx response (401 / 403 / 400 with
 * missing-param gate). A regression here is a Sev-1 bug per
 * docs/EXECUTION_PLAN.md §4.1.
 *
 * Contract:
 *   - We do NOT seed a user. `request` below uses a fresh browser
 *     context with no cookies; every call must be treated as anonymous.
 *   - We accept 400 for routes that require a missing body/query param
 *     check BEFORE the guard — those guards still kick in after the
 *     param is present, covered by unit tests on guardX().
 *   - We accept 401 or 403 for routes whose guard runs first.
 *   - We REJECT 200 / 201 / 204 — those mean the route leaked data.
 *   - We REJECT 500 — means the guard threw but didn't map to a proper
 *     HTTP status (the guardX wrappers fix this; 500 here is a regression).
 */

import { test, expect } from '@playwright/test'

// Routes that should reject an anonymous caller (401 / 403). Some also
// validate query/body params first; for those we send the param so the
// guard is actually exercised. Case ids are random — the guard should
// 403 (case not found / no access) before any data leaks.
const ROUTES: Array<{
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  body?: unknown
  // expected HTTP status set; response must be in this set
  expect: number[]
}> = [
  // case-scoped — guard runs on params.id
  { method: 'GET',   path: '/api/cases/anon-smoke/payments', expect: [401, 403] },
  { method: 'POST',  path: '/api/cases/anon-smoke/payments', body: { action: 'create' }, expect: [401, 403] },
  { method: 'PATCH', path: '/api/cases/anon-smoke/meta', body: { visaType: 'work' }, expect: [401, 403] },
  { method: 'POST',  path: '/api/cases/anon-smoke/documents/upload-url', body: { fileName: 'x.pdf', fileType: 'application/pdf' }, expect: [401, 403] },
  { method: 'GET',   path: '/api/cases/anon-smoke/timeline', expect: [401, 403] },

  // case-scoped via ?caseId=
  { method: 'GET',   path: '/api/journey?caseId=anon-smoke', expect: [401, 403] },
  { method: 'GET',   path: '/api/messages?caseId=anon-smoke', expect: [401, 403] },
  { method: 'GET',   path: '/api/documents?caseId=anon-smoke', expect: [401, 403] },
  { method: 'GET',   path: '/api/payments?caseId=anon-smoke', expect: [401, 403] },

  // audit: with caseId → guardCaseAccess; without → guardStaff
  { method: 'GET',   path: '/api/audit?caseId=anon-smoke', expect: [401, 403] },
  { method: 'GET',   path: '/api/audit', expect: [401, 403] },

  // staff-only
  { method: 'GET',   path: '/api/staff', expect: [401, 403] },
  { method: 'GET',   path: '/api/reports?since=30', expect: [401, 403] },

  // signup — public for role=client, but non-client role MUST be refused.
  // This anonymous caller asks for role=lvj_admin; expect 403.
  {
    method: 'POST', path: '/api/signup',
    body: { email: 'escalate@anon.smoke', password: 'x', firstName: 'Anon', lastName: 'Smoke', role: 'lvj_admin' },
    expect: [403],
  },
]

test.describe('S-003 · auth smoke (unauthed must not leak)', () => {
  for (const r of ROUTES) {
    test(`${r.method} ${r.path}`, async ({ request }) => {
      const res = await request.fetch(r.path, {
        method: r.method,
        data: r.body,
        headers: r.body ? { 'content-type': 'application/json' } : undefined,
      })
      const status = res.status()
      expect.soft(status, `status must be in ${JSON.stringify(r.expect)}`).toBeGreaterThanOrEqual(400)
      expect.soft(r.expect, `got ${status}`).toContain(status)
      // Whatever the code, the body must NOT look like leaked data.
      const ct = res.headers()['content-type'] ?? ''
      if (ct.includes('application/json')) {
        const body: any = await res.json().catch(() => null)
        // These are the top-level response keys the real handlers use; if we
        // see any of them on an unauthed request the guard is leaking.
        for (const leaky of ['items', 'messages', 'documents', 'payments', 'stages', 'kpis', 'case', 'user']) {
          expect.soft(body?.[leaky], `response leaked "${leaky}" on anonymous call`).toBeUndefined()
        }
      }
    })
  }
})
