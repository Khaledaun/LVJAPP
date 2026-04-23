/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock the audit writer BEFORE importing the wrapper. We want to
// assert on what got logged without touching a real DB.
const logAuditEventMock = jest.fn<any, any[]>()
jest.mock('@/lib/audit', () => ({
  logAuditEvent: (...args: any[]) => logAuditEventMock(...args),
}))

// Don't mock runPlatformOp — we want the real role check + context
// setup. But its internals don't write the DB themselves, so this
// is safe in unit-test mode.

async function loadWrapper() {
  jest.resetModules()
  return await import('@/lib/cross-tenant-pii')
}

function user(role: string): any {
  return { id: 'u_1', role }
}

describe('lib/cross-tenant-pii · runCrossTenantPIIAccess', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    process.env = { ...origEnv }
    process.env.SKIP_DB = '1' // logAuditEvent goes through the mock anyway
    logAuditEventMock.mockReset()
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('writes the audit row with action=cross_tenant_pii_access BEFORE the callback runs', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    let cbRan = false
    const order: string[] = []
    logAuditEventMock.mockImplementation(async () => {
      order.push('audit')
    })
    await runCrossTenantPIIAccess(
      user('LVJ_ADMIN'),
      { reason: 'DSAR export', targetTenantId: 'tenant_42' },
      async () => {
        cbRan = true
        order.push('cb')
        return 'done'
      },
    )
    expect(cbRan).toBe(true)
    expect(order).toEqual(['audit', 'cb'])
    expect(logAuditEventMock).toHaveBeenCalledTimes(1)
  })

  it('passes the canonical action string and structured metadata to logAuditEvent', async () => {
    const { runCrossTenantPIIAccess, CROSS_TENANT_PII_ACTION } = await loadWrapper()
    await runCrossTenantPIIAccess(
      user('LVJ_ADMIN'),
      {
        reason: 'PII read for support ticket #99',
        targetTenantId: 'tenant_99',
        fieldsAccessed: ['User.email', 'Case.clientNotes'],
      },
      async () => 'ok',
    )
    const [caseId, userId, action, detail] = logAuditEventMock.mock.calls[0]
    expect(action).toBe(CROSS_TENANT_PII_ACTION)
    expect(action).toBe('cross_tenant_pii_access')
    expect(caseId).toBeNull()
    expect(userId).toBe('u_1')
    expect(detail).toEqual({
      targetTenantId: 'tenant_99',
      reason: 'PII read for support ticket #99',
      fieldsAccessed: ['User.email', 'Case.clientNotes'],
      invokerRole: 'LVJ_ADMIN',
    })
  })

  it('rejects a non-platform role (delegated to runPlatformOp)', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    await expect(
      runCrossTenantPIIAccess(
        user('LAWYER_ADMIN'),
        { reason: 'trying', targetTenantId: 'tenant_99' },
        async () => 'ok',
      ),
    ).rejects.toThrow(/platform staff/)
  })

  it('rejects an empty reason', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    await expect(
      runCrossTenantPIIAccess(
        user('LVJ_ADMIN'),
        { reason: '', targetTenantId: 'tenant_99' },
        async () => 'ok',
      ),
    ).rejects.toThrow(/reason must be/)
  })

  it('rejects a reason over 128 chars', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    await expect(
      runCrossTenantPIIAccess(
        user('LVJ_ADMIN'),
        { reason: 'x'.repeat(129), targetTenantId: 'tenant_99' },
        async () => 'ok',
      ),
    ).rejects.toThrow(/reason must be/)
  })

  it('rejects when targetTenantId is missing', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    await expect(
      runCrossTenantPIIAccess(
        user('LVJ_ADMIN'),
        { reason: 'DSAR', targetTenantId: '' } as any,
        async () => 'ok',
      ),
    ).rejects.toThrow(/targetTenantId is required/)
  })

  it('fieldsAccessed defaults to [] when omitted', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    await runCrossTenantPIIAccess(
      user('LVJ_ADMIN'),
      { reason: 'inspection', targetTenantId: 'tenant_1' },
      async () => 'ok',
    )
    const [, , , detail] = logAuditEventMock.mock.calls[0]
    expect((detail as any).fieldsAccessed).toEqual([])
  })

  it('returns the callback return value', async () => {
    const { runCrossTenantPIIAccess } = await loadWrapper()
    const result = await runCrossTenantPIIAccess(
      user('LVJ_ADMIN'),
      { reason: 'read-for-test', targetTenantId: 'tenant_1' },
      async () => ({ rows: 3 }),
    )
    expect(result).toEqual({ rows: 3 })
  })
})
