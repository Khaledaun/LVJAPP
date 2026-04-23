import 'server-only'

import { buildTenantExtension } from './tenants'

let prisma: any

/**
 * Returns the singleton Prisma client with the Sprint 0.5 tenant
 * extension applied. Every tenant-scoped model is auto-filtered by
 * the active `TenantContext` (lib/tenants.ts). Call sites MUST wrap
 * queries in `withTenantContext(user, cb)` or `runPlatformOp(user,
 * reason, cb)` or the extension throws.
 *
 * `SKIP_DB=1` keeps the sandbox-without-DB discipline (§9.5 of
 * EXECUTION_PLAN.md): returns a Proxy that explains the skip.
 */
export async function getPrisma(): Promise<any> {
  if (process.env.SKIP_DB === '1') {
    const explain = new Error('DB disabled (SKIP_DB=1). Set DATABASE_URL + run "npx prisma generate" to enable.')
    return new Proxy({}, { get(){ throw explain }, apply(){ throw explain } })
  }
  if (prisma) return prisma
  try {
    const { PrismaClient } = await import('@prisma/client')
    const raw = new PrismaClient()
    prisma = buildTenantExtension()(raw)
    return prisma
  } catch (err) {
    const explain = new Error('@prisma/client not ready. Set DATABASE_URL, add prisma/schema.prisma, and run: npx prisma generate')
    return new Proxy({}, { get(){ throw explain }, apply(){ throw explain } })
  }
}

// Back-compat export for legacy callers; do NOT add new imports of this.
// New code should go through `getPrisma()` so the extension is guaranteed.
export { prisma };
