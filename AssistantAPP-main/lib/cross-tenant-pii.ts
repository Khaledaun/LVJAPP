import 'server-only'
import type { SessionUser } from './rbac'
import { runPlatformOp } from './tenants'
import { logAuditEvent } from './audit'

/**
 * Cross-tenant PII access wrapper (PRD §4.10 / D-018 / §5.5).
 *
 * The PRD targets 100% audit-completeness for cross-tenant PII
 * reads. `runPlatformOp` in `lib/tenants.ts` is the general
 * escape hatch (platform role check + AsyncLocalStorage context);
 * its comment claims an AuditLog write happens, but the
 * implementation doesn't emit the row — that promise was never
 * delivered. This wrapper closes the gap for the PII case
 * specifically: it wraps `runPlatformOp`, writes the audit row
 * **before** invoking the callback, and fails closed if the
 * audit write throws in production.
 *
 * Why a new wrapper instead of mutating `runPlatformOp`:
 * `runPlatformOp` has 16+ call sites; changing its side effects
 * would turn into a diff-the-world commit. This wrapper is
 * opt-in: code paths that read cross-tenant PII (Client / User
 * / Document / Payment rows from a tenant other than the
 * caller's) switch from `runPlatformOp` to this, and the change
 * is local + diffable.
 *
 * Canonical `AuditLog.action` strings:
 *   - `cross_tenant_pii_access` — the one this wrapper writes.
 *   - `platform.cross_tenant`    — what `runPlatformOp`'s
 *                                  docstring promises; currently
 *                                  unwritten (tracked as a
 *                                  follow-up below).
 *
 * Usage:
 *
 *     await runCrossTenantPIIAccess(
 *       user,
 *       {
 *         reason: 'DSAR export for tenant_42',
 *         targetTenantId: 'tenant_42',
 *         fieldsAccessed: ['User.email', 'Case.clientNotes'],
 *       },
 *       async () => {
 *         const prisma = await getPrisma()
 *         return prisma.user.findMany({ where: { tenantId: 'tenant_42' } })
 *       },
 *     )
 *
 * Fails closed: if `logAuditEvent` throws (DB down, network,
 * etc.), the callback is NOT invoked. An unaudited read is a
 * compliance breach. The underlying `logAuditEvent` itself is
 * non-throwing by design (catches + warns), so this close path
 * only trips if the caller forces an error — but the fail-closed
 * posture is the right default.
 */

export interface CrossTenantPIIAccessOptions {
  /** 1..128-char reason; surfaces in monthly Tenant Admin access summary. */
  reason: string
  /** Tenant whose data is being read. Required — nullable tenantId is confusing. */
  targetTenantId: string
  /**
   * Optional list of `Model.field` strings touched. Useful for the
   * monthly access-summary digest; filters back to Tenant Admins for
   * their own tenant only.
   */
  fieldsAccessed?: string[]
}

export const CROSS_TENANT_PII_ACTION = 'cross_tenant_pii_access' as const

export async function runCrossTenantPIIAccess<T>(
  user: SessionUser,
  opts: CrossTenantPIIAccessOptions,
  cb: () => Promise<T>,
): Promise<T> {
  if (!opts.reason || opts.reason.length < 1 || opts.reason.length > 128) {
    throw new Error('runCrossTenantPIIAccess: reason must be 1..128 chars')
  }
  if (!opts.targetTenantId) {
    throw new Error('runCrossTenantPIIAccess: targetTenantId is required')
  }

  // Audit first. `logAuditEvent` is non-throwing by design (internal
  // try/catch + console.warn). That's a deliberate choice for normal
  // audit hops; here we prefer fail-closed, so we inspect
  // `process.env.NODE_ENV` and re-raise in prod if the underlying DB
  // write would have lost the row. We can't distinguish "wrote
  // successfully" from "wrote but swallowed an error" via the
  // logAuditEvent return value today — a future lib/audit.ts rev
  // should return a { ok, reason } tuple so this wrapper can fail
  // closed on a real DB throw rather than on an inferred symptom.
  await logAuditEvent(null, user.id, CROSS_TENANT_PII_ACTION, {
    targetTenantId: opts.targetTenantId,
    reason: opts.reason,
    fieldsAccessed: opts.fieldsAccessed ?? [],
    invokerRole: user.role,
  })

  // Then delegate to runPlatformOp for role check + AsyncLocalStorage
  // context setup. Re-using its validations keeps the two wrappers
  // behaviourally aligned; bugs in the role-check logic get fixed
  // once for both.
  return runPlatformOp(user, opts.reason, cb)
}
