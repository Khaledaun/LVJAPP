import 'server-only'
import { getPrisma } from './db'

/**
 * Audit log writer.
 *
 * Writes to the AuditLog Prisma model (added in Sprint 0 schema migration).
 * Non-fatal: failures are logged but never block the calling operation.
 *
 * Back-compat: `logAudit(prisma, entry)` preserves the prior signature so that
 * callers importing the old API continue to work.
 */

export interface AuditEventInput {
  action: string
  caseId?: string | null
  userId?: string | null
  diff?: unknown
}

async function write(entry: AuditEventInput): Promise<void> {
  try {
    if (process.env.SKIP_DB === '1') {
      // eslint-disable-next-line no-console
      console.log('[AUDIT mock]', entry)
      return
    }
    const prisma = await getPrisma()
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        caseId: entry.caseId ?? null,
        userId: entry.userId ?? null,
        diff: (entry.diff ?? null) as any,
      },
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[AUDIT] write failed (non-fatal):', err)
  }
}

/** Canonical audit writer. */
export async function logAuditEvent(
  caseId: string | null | undefined,
  userId: string | null | undefined,
  action: string,
  detail?: unknown,
): Promise<void> {
  await write({ action, caseId: caseId ?? null, userId: userId ?? null, diff: detail })
}

/** Back-compat: prior shape took a prisma client + entry object. */
export async function logAudit(_prismaUnused: unknown, e: AuditEventInput): Promise<void> {
  await write(e)
}
