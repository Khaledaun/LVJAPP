/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('lib/audit — logAuditEvent', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.SKIP_DB
  })

  it('is a no-op in SKIP_DB=1 mode and never throws', async () => {
    process.env.SKIP_DB = '1'
    const { logAuditEvent } = await import('@/lib/audit')
    await expect(logAuditEvent('c1', 'u1', 'test.action', { foo: 'bar' })).resolves.toBeUndefined()
  })

  it('writes to prisma.auditLog.create with canonical field names', async () => {
    // `as never` — jest-mock v30 types the mockResolvedValue slot
    // as `never` when `jest.fn()` has no explicit generic. Issue #11 §4.
    const create = jest.fn().mockResolvedValue({ id: 'a1' } as never)
    jest.doMock('@/lib/db', () => ({
      getPrisma: async () => ({ auditLog: { create } }),
    }))

    const { logAuditEvent } = await import('@/lib/audit')
    await logAuditEvent('case-xyz', 'user-42', 'case.updated', { from: 'new', to: 'in_review' })

    expect(create).toHaveBeenCalledTimes(1)
    const call = (create.mock.calls[0] as any[])[0]
    expect(call).toEqual({
      data: {
        action: 'case.updated',
        caseId: 'case-xyz',
        userId: 'user-42',
        diff: { from: 'new', to: 'in_review' },
      },
    })
  })

  it('swallows DB errors (non-fatal audit policy)', async () => {
    jest.doMock('@/lib/db', () => ({
      getPrisma: async () => ({
        auditLog: {
          create: jest.fn().mockRejectedValue(new Error('pg down') as never),
        },
      }),
    }))
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { logAuditEvent } = await import('@/lib/audit')
    await expect(logAuditEvent(null, null, 'x')).resolves.toBeUndefined()
    warn.mockRestore()
  })

  it('legacy logAudit(prisma, entry) signature still works', async () => {
    const create = jest.fn().mockResolvedValue({} as never)
    jest.doMock('@/lib/db', () => ({
      getPrisma: async () => ({ auditLog: { create } }),
    }))
    const { logAudit } = await import('@/lib/audit')
    await logAudit(null, { action: 'legacy.call', caseId: 'c', userId: 'u', diff: { a: 1 } })
    expect(create).toHaveBeenCalled()
  })
})
