#!/usr/bin/env tsx
/**
 * A-003 · Tenant-isolation audit — CLI wrapper.
 *
 * All logic lives in `lib/audits/tenant.ts` so the nightly cron
 * (`app/api/cron/audit-tenant-nightly/route.ts`) uses the same entry
 * point. See docs/DECISIONS.md D-023.
 *
 * Usage:
 *   npx tsx scripts/audit-tenant.ts
 *
 * Exit 0 on clean, 1 on any violation.
 */

import { runAuditTenant } from '../lib/audits/tenant'

function main(): void {
  console.log('A-003 · Tenant-isolation audit (D-023)')
  const result = runAuditTenant()

  if (result.schemaErrors.length) {
    for (const err of result.schemaErrors) console.error(err)
    process.exit(1)
  }

  console.log(`  schema:      ${result.schema.modelsWithTenantId.length} models with tenantId`)
  console.log(
    `  lib/tenants: ${result.schema.scopedInLib.length} strict + ${result.schema.nullableInLib.length} nullable`,
  )

  if (result.schema.missingFromLib.length) {
    console.error('\nSchema has tenantId but lib/tenants.ts does NOT list:')
    for (const m of result.schema.missingFromLib) console.error(`  - ${m}`)
    console.error(
      '\nAdd each missing model to TENANT_SCOPED_MODELS (NOT NULL) or ' +
      'TENANT_NULLABLE_MODELS (nullable) in lib/tenants.ts.',
    )
    process.exit(1)
  }
  if (result.schema.extraInLib.length) {
    console.error('\nlib/tenants.ts lists models that do NOT have tenantId in schema:')
    for (const m of result.schema.extraInLib) console.error(`  - ${m}`)
    process.exit(1)
  }
  console.log('  OK — schema and lib/tenants.ts agree')

  console.log(`  routes scanned: ${result.routesScanned}`)
  console.log(`  routes using prisma without tenant helper: ${result.violations.length}`)

  if (result.violations.length) {
    console.error('\nRoutes using prisma without a tenant helper:')
    for (const v of result.violations) console.error(`  - ${v}`)
    console.error(
      '\nWrap the prisma call in withTenantContext() or runPlatformOp(), ' +
      'or add the route to INTENTIONAL_PUBLIC_ROUTES in lib/audits/tenant.ts ' +
      'if it is a verified public webhook.',
    )
    process.exit(1)
  }

  console.log('\nOK — no tenant-isolation violations.')
}

main()
