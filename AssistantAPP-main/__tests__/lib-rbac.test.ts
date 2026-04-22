/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('lib/rbac — pure helpers', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.SKIP_AUTH
    delete process.env.NEXT_PUBLIC_SKIP_AUTH
  })

  it('isGlobalAdmin recognises ADMIN / LVJ_ADMIN variants', async () => {
    const { isGlobalAdmin } = await import('@/lib/rbac')
    expect(isGlobalAdmin('ADMIN')).toBe(true)
    expect(isGlobalAdmin('LVJ_ADMIN')).toBe(true)
    expect(isGlobalAdmin('lvj_admin')).toBe(true)
    expect(isGlobalAdmin('CLIENT')).toBe(false)
    expect(isGlobalAdmin(null)).toBe(false)
    expect(isGlobalAdmin(undefined)).toBe(false)
  })

  it('isStaff accepts all lawyer/lvj roles but rejects client', async () => {
    const { isStaff } = await import('@/lib/rbac')
    expect(isStaff('STAFF')).toBe(true)
    expect(isStaff('LAWYER_ASSISTANT')).toBe(true)
    expect(isStaff('lawyer_associate')).toBe(true)
    expect(isStaff('CLIENT')).toBe(false)
    expect(isStaff('client')).toBe(false)
  })

  it('getRoleDisplayName maps each new role to a human label', async () => {
    const { getRoleDisplayName } = await import('@/lib/rbac')
    expect(getRoleDisplayName('LVJ_ADMIN')).toBe('Administrator')
    expect(getRoleDisplayName('LAWYER_ADMIN')).toBe('Managing Attorney')
    expect(getRoleDisplayName('LAWYER_ASSOCIATE')).toBe('Associate Attorney')
    expect(getRoleDisplayName('LAWYER_ASSISTANT')).toBe('Legal Assistant')
    expect(getRoleDisplayName('CLIENT')).toBe('Client')
    expect(getRoleDisplayName('UNKNOWN')).toBe('User')
  })

  it('canAccessRoute restricts /admin routes to global admins', async () => {
    const { canAccessRoute } = await import('@/lib/rbac')
    expect(canAccessRoute('LVJ_ADMIN', '/admin/team')).toBe(true)
    expect(canAccessRoute('ADMIN', '/admin/team')).toBe(true)
    expect(canAccessRoute('LAWYER_ADMIN', '/admin/team')).toBe(false)
    expect(canAccessRoute('client', '/admin/team')).toBe(false)
  })

  it('canAccessRoute allows staff to /cases and /dashboard', async () => {
    const { canAccessRoute } = await import('@/lib/rbac')
    expect(canAccessRoute('LAWYER_ASSOCIATE', '/cases/abc')).toBe(true)
    expect(canAccessRoute('LVJ_TEAM', '/dashboard')).toBe(true)
    expect(canAccessRoute('client', '/cases/abc')).toBe(false)
  })

  it('canAccessRoute allows clients only to /my-case and /documents/view', async () => {
    const { canAccessRoute } = await import('@/lib/rbac')
    expect(canAccessRoute('client', '/my-case')).toBe(true)
    expect(canAccessRoute('client', '/documents/view')).toBe(true)
  })

  it('SKIP_AUTH=1 grants full access regardless of role', async () => {
    process.env.SKIP_AUTH = '1'
    const { canAccessRoute } = await import('@/lib/rbac')
    expect(canAccessRoute('client', '/admin/team')).toBe(true)
  })
})

describe('lib/rbac — assertCaseAccess (session-aware guard)', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.SKIP_AUTH
    delete process.env.NEXT_PUBLIC_SKIP_AUTH
  })

  it('dev bypass returns a LVJ_ADMIN session when SKIP_AUTH=1', async () => {
    process.env.SKIP_AUTH = '1'
    const { assertCaseAccess } = await import('@/lib/rbac')
    const { user } = await assertCaseAccess('any-case')
    expect(user?.id).toBe('dev-bypass')
    expect(user?.role).toBe('LVJ_ADMIN')
  })

  it('throws 401 when there is no session', async () => {
    jest.doMock('next-auth', () => ({ getServerSession: async () => null }))
    jest.doMock('@/lib/auth', () => ({ getAuthOptions: () => ({}) }))
    const { assertCaseAccess } = await import('@/lib/rbac')
    await expect(assertCaseAccess('c1')).rejects.toMatchObject({ status: 401 })
  })

  it('grants access when session user is the case lawyer', async () => {
    jest.doMock('next-auth', () => ({
      getServerSession: async () => ({ user: { id: 'u1', role: 'LAWYER_ASSOCIATE' } }),
    }))
    jest.doMock('@/lib/auth', () => ({ getAuthOptions: () => ({}) }))
    jest.doMock('@/lib/db', () => ({
      getPrisma: async () => ({
        case: {
          findUnique: async () => ({
            id: 'c1', clientId: 'someoneElse', caseManagerId: null, lawyerId: 'u1', officeId: null,
          }),
        },
      }),
    }))
    const { assertCaseAccess } = await import('@/lib/rbac')
    const { user } = await assertCaseAccess('c1')
    expect(user?.id).toBe('u1')
  })

  it('denies when user is not attached to the case and is not a global admin', async () => {
    jest.doMock('next-auth', () => ({
      getServerSession: async () => ({ user: { id: 'u1', role: 'LAWYER_ASSOCIATE' } }),
    }))
    jest.doMock('@/lib/auth', () => ({ getAuthOptions: () => ({}) }))
    jest.doMock('@/lib/db', () => ({
      getPrisma: async () => ({
        case: {
          findUnique: async () => ({
            id: 'c1', clientId: 'x', caseManagerId: 'y', lawyerId: 'z', officeId: 'officeA',
          }),
        },
      }),
    }))
    const { assertCaseAccess } = await import('@/lib/rbac')
    await expect(assertCaseAccess('c1')).rejects.toMatchObject({ status: 403 })
  })

  it('allows lawyer_admin in the same office as the case', async () => {
    jest.doMock('next-auth', () => ({
      getServerSession: async () => ({
        user: { id: 'admin1', role: 'LAWYER_ADMIN', officeId: 'officeA' },
      }),
    }))
    jest.doMock('@/lib/auth', () => ({ getAuthOptions: () => ({}) }))
    jest.doMock('@/lib/db', () => ({
      getPrisma: async () => ({
        case: {
          findUnique: async () => ({
            id: 'c1', clientId: 'x', caseManagerId: null, lawyerId: null, officeId: 'officeA',
          }),
        },
      }),
    }))
    const { assertCaseAccess } = await import('@/lib/rbac')
    const { user } = await assertCaseAccess('c1')
    expect(user?.id).toBe('admin1')
  })
})

describe('lib/rbac — assertOrgAccess', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.SKIP_AUTH
    delete process.env.NEXT_PUBLIC_SKIP_AUTH
  })

  it('allows the user when their officeId matches the requested org', async () => {
    jest.doMock('next-auth', () => ({
      getServerSession: async () => ({
        user: { id: 'u1', role: 'LAWYER_ASSOCIATE', officeId: 'office-7' },
      }),
    }))
    jest.doMock('@/lib/auth', () => ({ getAuthOptions: () => ({}) }))
    const { assertOrgAccess } = await import('@/lib/rbac')
    const { user } = await assertOrgAccess('office-7')
    expect(user?.id).toBe('u1')
  })

  it('denies a user whose office does not match', async () => {
    jest.doMock('next-auth', () => ({
      getServerSession: async () => ({
        user: { id: 'u1', role: 'LAWYER_ASSOCIATE', officeId: 'office-7' },
      }),
    }))
    jest.doMock('@/lib/auth', () => ({ getAuthOptions: () => ({}) }))
    const { assertOrgAccess } = await import('@/lib/rbac')
    await expect(assertOrgAccess('office-9')).rejects.toMatchObject({ status: 403 })
  })
})
