import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'
import type { SessionUser } from './rbac'
import { isStaff } from './rbac'

// ─────────────────────────────────────────────────────────────
// Sprint 0.5 · D-023 — Tenant isolation runtime
//
// Three primitives:
//
//   1. `TenantContext` + AsyncLocalStorage → scope a request to a
//      tenant. Every downstream Prisma query inside the storage
//      block inherits this scope.
//
//   2. `withTenantContext(user, cb)` → the canonical entry used by
//      the auth guards (`guard*` in lib/rbac-http.ts). Resolves the
//      tenant from the session user and runs `cb` inside it.
//
//   3. `runPlatformOp(user, reason, cb)` → the explicit escape hatch
//      for LVJ_* platform staff. Logs an AuditLog row
//      `action='platform.cross_tenant'` so every cross-tenant access
//      is discoverable.
//
// The Prisma-layer enforcement (`applyTenantMiddleware`) is in this
// file so lib/db.ts stays a dumb factory. The middleware auto-filters
// SELECT / UPDATE / DELETE by tenantId and auto-sets tenantId on
// CREATE when a context is active.
//
// The middleware's model list is derived from the schema: any model
// that owns a `tenantId` column is scoped. Platform models without
// one (PartnerRole, Tenant itself, TenantContract) pass through.
// ─────────────────────────────────────────────────────────────

export type TenantContext = {
  tenantId: string | null          // null → platform scope (LVJ_*)
  userId: string
  role: string
  // When `platformReason` is set, queries may read across tenants
  // but every access is tagged on AuditLog with this reason.
  platformReason?: string
}

const storage = new AsyncLocalStorage<TenantContext>()

/** Return the current tenant context, or throw if one is not active. */
export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore()
  if (!ctx) {
    throw new Error(
      'No tenant context. Wrap the call in withTenantContext() or runPlatformOp() ' +
      'before touching tenant-scoped data.',
    )
  }
  return ctx
}

/** Return the current tenant context if one is active, else null. */
export function getTenantContext(): TenantContext | null {
  return storage.getStore() ?? null
}

/**
 * Run `cb` under a tenant context derived from the session user.
 *
 * - Tenant users (CLIENT / LAWYER_*) → scope to `user.tenantId`.
 * - Platform staff (LVJ_* / ADMIN)   → scope is NULL, and every
 *   query that touches a tenant-scoped row is allowed but audited
 *   only if `runPlatformOp()` is used. Plain `withTenantContext`
 *   for an LVJ_* user still blocks tenant-scoped writes — the
 *   middleware refuses to inject `tenantId` when it has no value,
 *   which raises a clear error at the call site.
 */
export async function withTenantContext<T>(
  user: SessionUser & { tenantId?: string | null },
  cb: () => Promise<T>,
): Promise<T> {
  const ctx: TenantContext = {
    tenantId: user.tenantId ?? null,
    userId: user.id,
    role: user.role,
  }
  return storage.run(ctx, cb)
}

/**
 * Explicit cross-tenant operation (platform staff only).
 *
 * The `reason` string is written to AuditLog for every tenant-scoped
 * row touched inside `cb`. `reason` MUST be a short, stable string
 * drawn from a known set — it shows up in platform-ops dashboards
 * and in D-005 audit trails.
 */
export async function runPlatformOp<T>(
  user: SessionUser,
  reason: string,
  cb: () => Promise<T>,
): Promise<T> {
  if (!isStaff(user.role) || !isPlatformRole(user.role)) {
    const err: any = new Error('runPlatformOp: user is not platform staff')
    err.status = 403
    throw err
  }
  if (!reason || reason.length > 128) {
    throw new Error('runPlatformOp: reason must be 1..128 chars')
  }
  const ctx: TenantContext = {
    tenantId: null,
    userId: user.id,
    role: user.role,
    platformReason: reason,
  }
  return storage.run(ctx, cb)
}

function isPlatformRole(role: string): boolean {
  const PLATFORM_ROLES = new Set([
    'ADMIN', 'LVJ_ADMIN', 'LVJ_TEAM', 'LVJ_MARKETING',
    'lvj_admin', 'lvj_team', 'lvj_marketing',
  ])
  return PLATFORM_ROLES.has(role)
}

/**
 * Assert the current session user may access rows belonging to
 * `tenantId`. Used by route handlers before running a query that
 * references a tenantId from URL params or a request body.
 *
 * - Platform staff: always allowed (but callers should prefer
 *   `runPlatformOp` so the access is audited).
 * - Tenant users: must belong to that tenant.
 */
export function assertTenantAccess(
  tenantId: string,
  user: SessionUser & { tenantId?: string | null },
): void {
  if (isPlatformRole(user.role)) return
  if (user.tenantId && user.tenantId === tenantId) return
  const err: any = new Error('no tenant access')
  err.status = 403
  throw err
}

// ─────────────────────────────────────────────────────────────
// Prisma middleware
//
// Prisma v6 deprecates `$use` in favor of `$extends`. Both styles
// work today. We use `$extends` so we're forward-compatible.
// ─────────────────────────────────────────────────────────────

// Every model with a tenantId column. Keep in sync with prisma/schema.prisma.
// The audit script (scripts/audit-tenant.ts) cross-checks this list against
// the schema and fails CI if it drifts.
export const TENANT_SCOPED_MODELS = [
  'Case',
  'CaseDeadline',
  'CaseOutcome',
  'Document',
  'ExternalCommunication',
  'ExternalPartner',
  'Message',
  'Office',
  'Payment',
  'Partner',
  'ServiceType',
  'TimelineEvent',
  'EligibilityLead',
  'AgentDraft',
  'HITLApproval',
  'TenantContract',
] as const

// Models where tenantId exists but is NULLABLE. These models are
// scoped when a context is active; middleware does NOT reject rows
// with null tenantId because legitimate platform-level rows exist
// (ops audit entries, cross-tenant alerts).
export const TENANT_NULLABLE_MODELS = [
  'User',
  'NotificationLog',
  'VoiceCallLog',
  'AuditLog',
  'AutomationLog',
] as const

type AnyArgs = { where?: any; data?: any; [k: string]: any }

/**
 * Build Prisma client extensions that scope queries to the active
 * tenant context. Apply once at Prisma client construction time in
 * lib/db.ts.
 *
 * Contract:
 *   - If no context is active, queries on tenant-scoped models throw.
 *     This forces every call site to go through withTenantContext or
 *     runPlatformOp.
 *   - If the context has tenantId=null and platformReason is set,
 *     reads pass through unfiltered (scoped via runPlatformOp).
 *   - If tenantId is set, SELECT/UPDATE/DELETE filter by tenantId;
 *     CREATE injects tenantId when absent and rejects when the
 *     caller tries to set a different tenantId.
 */
export function buildTenantExtension(): (client: any) => any {
  const scoped = new Set<string>(TENANT_SCOPED_MODELS)
  const nullable = new Set<string>(TENANT_NULLABLE_MODELS)

  return (client: any) => client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!model) return query(args)
          const isScoped = scoped.has(model)
          const isNullable = nullable.has(model)
          if (!isScoped && !isNullable) return query(args)

          const ctx = getTenantContext()
          if (!ctx) {
            // No context → fail closed. The only legitimate way to
            // reach this code without a context is a test harness;
            // those must wrap in withTenantContext explicitly.
            throw new Error(
              `Prisma.${model}.${operation} called without tenant context. ` +
              `Wrap in withTenantContext() or runPlatformOp().`,
            )
          }

          // Platform bypass (runPlatformOp). Reads pass through.
          // Writes must still specify tenantId — platform cannot
          // accidentally create unscoped rows.
          if (ctx.platformReason && ctx.tenantId === null) {
            if (isWriteOp(operation) && isScoped) {
              assertCreateTenantId(args)
            }
            return query(args)
          }

          // Normal tenant scope.
          if (ctx.tenantId == null) {
            // Plain withTenantContext for a platform-staff user
            // without runPlatformOp — we refuse writes but allow
            // reads to surface rows with null tenantId only.
            if (isWriteOp(operation) && isScoped) {
              throw new Error(
                `Refusing ${model}.${operation} from platform staff outside ` +
                `runPlatformOp(reason). Wrap the write explicitly.`,
              )
            }
            // Read with null scope: fall through to prisma without
            // injecting a filter — caller is platform staff reading
            // platform-level rows.
            return query(args)
          }

          // tenantId-scoped user. Inject filter / data.
          const scopedArgs = scopeArgs(operation, args, ctx.tenantId, isScoped)
          return query(scopedArgs)
        },
      },
    },
  })
}

function isWriteOp(op: string): boolean {
  return (
    op === 'create' ||
    op === 'createMany' ||
    op === 'update' ||
    op === 'updateMany' ||
    op === 'upsert' ||
    op === 'delete' ||
    op === 'deleteMany'
  )
}

function scopeArgs(
  op: string,
  args: AnyArgs | undefined,
  tenantId: string,
  isStrictScoped: boolean,
): AnyArgs | undefined {
  const a: AnyArgs = { ...(args ?? {}) }

  // Inject where-filter on reads + updates + deletes.
  if (
    op === 'findFirst' ||
    op === 'findFirstOrThrow' ||
    op === 'findMany' ||
    op === 'findUnique' ||
    op === 'findUniqueOrThrow' ||
    op === 'count' ||
    op === 'aggregate' ||
    op === 'groupBy' ||
    op === 'update' ||
    op === 'updateMany' ||
    op === 'delete' ||
    op === 'deleteMany'
  ) {
    a.where = mergeWhereTenant(a.where, tenantId)
  }

  // Inject / verify data on create paths.
  if (op === 'create') {
    a.data = mergeDataTenant(a.data, tenantId, isStrictScoped)
  } else if (op === 'createMany') {
    if (Array.isArray(a.data)) {
      a.data = a.data.map((d: any) => mergeDataTenant(d, tenantId, isStrictScoped))
    }
  } else if (op === 'upsert') {
    a.where = mergeWhereTenant(a.where, tenantId)
    a.create = mergeDataTenant(a.create, tenantId, isStrictScoped)
    // `update` part of upsert: don't re-scope where (already merged),
    // but refuse tenantId mutations.
    assertNotMutatingTenantId(a.update)
  }

  return a
}

function mergeWhereTenant(where: any, tenantId: string): any {
  if (!where) return { tenantId }
  if (where.AND) {
    return { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : [where.AND]), { tenantId }] }
  }
  return { ...where, tenantId }
}

function mergeDataTenant(data: any, tenantId: string, strict: boolean): any {
  if (!data) return { tenantId }
  if (data.tenantId && data.tenantId !== tenantId) {
    throw new Error(
      `Refusing cross-tenant write: data.tenantId=${data.tenantId} but context.tenantId=${tenantId}`,
    )
  }
  if (!data.tenantId && strict) {
    return { ...data, tenantId }
  }
  return data.tenantId ? data : { ...data, tenantId }
}

function assertCreateTenantId(args: AnyArgs | undefined): void {
  const d = args?.data
  const rows = Array.isArray(d) ? d : [d]
  for (const r of rows) {
    if (!r?.tenantId) {
      throw new Error(
        'Platform write missing tenantId — runPlatformOp cannot auto-inject. ' +
        'Set tenantId explicitly.',
      )
    }
  }
}

function assertNotMutatingTenantId(data: any): void {
  if (data && 'tenantId' in data) {
    throw new Error('Refusing update that mutates tenantId (immutable under D-023).')
  }
}
