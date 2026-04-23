/**
 * Unit tests for lib/rbac-http.ts — the Sprint 0.1 guard wrappers that
 * turn lib/rbac.ts throws into proper 401/403 NextResponses.
 *
 * These tests never touch Prisma or next-auth; the underlying assert*
 * functions are mocked per test.
 */

// next/server's NextResponse.json relies on the Node runtime's Response
// global. In Jest (jsdom or node env), we polyfill a minimal version.

jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/rbac', () => ({
  assertCaseAccess: jest.fn(),
  assertOrgAccess: jest.fn(),
  assertStaff: jest.fn(),
}))

import { assertCaseAccess, assertOrgAccess, assertStaff } from '@/lib/rbac'
import { guardCaseAccess, guardOrgAccess, guardStaff } from '@/lib/rbac-http'

const mockAssertCase = assertCaseAccess as jest.MockedFunction<typeof assertCaseAccess>
const mockAssertOrg = assertOrgAccess as jest.MockedFunction<typeof assertOrgAccess>
const mockAssertStaff = assertStaff as jest.MockedFunction<typeof assertStaff>

function err(status: number, message: string): Error & { status: number } {
  const e: any = new Error(message)
  e.status = status
  return e
}

describe('lib/rbac-http', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('guardCaseAccess', () => {
    it('returns ok:true + user when the case assertion passes', async () => {
      mockAssertCase.mockResolvedValueOnce({
        user: { id: 'u1', role: 'LAWYER_ADMIN', officeId: 'o1' },
      })
      const g = await guardCaseAccess('case-1')
      expect(g.ok).toBe(true)
      if (g.ok) expect(g.user.id).toBe('u1')
    })

    it('returns a 401 response when assertion throws unauthorized', async () => {
      mockAssertCase.mockRejectedValueOnce(err(401, 'unauthorized'))
      const g = await guardCaseAccess('case-1')
      expect(g.ok).toBe(false)
      if (!g.ok) {
        expect(g.response.status).toBe(401)
        const body = await g.response.json()
        expect(body.error).toBe('unauthorized')
      }
    })

    it('returns a 403 response when assertion throws forbidden', async () => {
      mockAssertCase.mockRejectedValueOnce(err(403, 'no case access'))
      const g = await guardCaseAccess('case-1')
      expect(g.ok).toBe(false)
      if (!g.ok) {
        expect(g.response.status).toBe(403)
        const body = await g.response.json()
        expect(body.error).toBe('no case access')
      }
    })

    it('defaults to 401 when thrown error has no status', async () => {
      mockAssertCase.mockRejectedValueOnce(new Error('weird'))
      const g = await guardCaseAccess('case-1')
      expect(g.ok).toBe(false)
      if (!g.ok) expect(g.response.status).toBe(401)
    })
  })

  describe('guardOrgAccess', () => {
    it('maps a forbidden throw to 403', async () => {
      mockAssertOrg.mockRejectedValueOnce(err(403, 'no org access'))
      const g = await guardOrgAccess('org-1')
      expect(g.ok).toBe(false)
      if (!g.ok) expect(g.response.status).toBe(403)
    })
  })

  describe('guardStaff', () => {
    it('returns ok:true for a valid staff user', async () => {
      mockAssertStaff.mockResolvedValueOnce({
        user: { id: 'u2', role: 'LVJ_ADMIN', officeId: null },
      })
      const g = await guardStaff()
      expect(g.ok).toBe(true)
    })

    it('maps a client-role reject to 403', async () => {
      mockAssertStaff.mockRejectedValueOnce(err(403, 'staff only'))
      const g = await guardStaff()
      expect(g.ok).toBe(false)
      if (!g.ok) expect(g.response.status).toBe(403)
    })

    it('maps an unauthenticated reject to 401', async () => {
      mockAssertStaff.mockRejectedValueOnce(err(401, 'unauthorized'))
      const g = await guardStaff()
      expect(g.ok).toBe(false)
      if (!g.ok) expect(g.response.status).toBe(401)
    })
  })
})
