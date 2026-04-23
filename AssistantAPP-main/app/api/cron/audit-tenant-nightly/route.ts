import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'
import { runAuditTenant } from '@/lib/audits/tenant'

// Vercel Cron schedule: daily 03:15 UTC (vercel.json · `15 3 * * *`).
// Nightly (not weekly) because D-023 tenant-isolation drift is a
// Sev-1 pager event — every morning operators want a clean run.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  return runCron(req, async ({ correlationId, path }) => {
    const result = runAuditTenant()
    const summary = {
      id: 'a003',
      path,
      correlationId,
      ok: result.ok,
      schema: {
        modelsWithTenantId: result.schema.modelsWithTenantId.length,
        scopedInLib: result.schema.scopedInLib.length,
        nullableInLib: result.schema.nullableInLib.length,
        missingFromLib: result.schema.missingFromLib,
        extraInLib: result.schema.extraInLib,
      },
      routesScanned: result.routesScanned,
      routeViolations: result.violations,
      schemaErrors: result.schemaErrors,
    }
    console.log(
      `[cron.audit.a003] ${result.ok ? 'ok' : 'FAIL'} correlationId=${correlationId} ` +
        `missing=${result.schema.missingFromLib.length} extra=${result.schema.extraInLib.length} ` +
        `routeViolations=${result.violations.length}`,
    )
    return NextResponse.json(summary)
  })
}
