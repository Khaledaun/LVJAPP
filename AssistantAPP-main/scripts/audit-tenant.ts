#!/usr/bin/env tsx
/**
 * A-003 · Tenant-isolation audit (Sprint 0.5 · D-023)
 *
 * Two checks, both hard-failing:
 *
 *   1. Schema check. Every model declared in prisma/schema.prisma that
 *      carries a `tenantId` column MUST appear in the allow-list in
 *      lib/tenants.ts (either TENANT_SCOPED_MODELS or
 *      TENANT_NULLABLE_MODELS). Any new tenant-scoped model that lands
 *      without being added to the middleware allow-list would silently
 *      bypass the scoping middleware — this audit fails CI before that
 *      can happen.
 *
 *   2. Route check. Every route under `app/api/` that imports prisma
 *      (directly or transitively) MUST also import from
 *      `@/lib/tenants` (withTenantContext, runPlatformOp, or
 *      assertTenantAccess). Routes on the A-002 INTENTIONAL_PUBLIC
 *      allow-list are exempt — HMAC-verified webhooks set their own
 *      tenant context explicitly inside the handler.
 *
 * Exit codes:
 *   0 — clean
 *   1 — any violation
 *
 * Usage:
 *   npx tsx scripts/audit-tenant.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCHEMA = join(ROOT, 'prisma/schema.prisma')
const TENANTS_LIB = join(ROOT, 'lib/tenants.ts')
const API_DIR = join(ROOT, 'app/api')

// Routes on A-002's INTENTIONAL_PUBLIC list. Kept in sync with
// scripts/audit-auth.ts manually — if it drifts, the route check
// below complains, which is the right signal.
const INTENTIONAL_PUBLIC_ROUTES = new Set<string>([
  'app/api/health/route.ts',
  'app/api/auth/[...nextauth]/route.ts',
  'app/api/signup/route.ts',
  'app/api/terms/latest/route.ts',
  'app/api/webhooks/webflow/route.ts',
])

function die(msg: string): never {
  console.error(msg)
  process.exit(1)
}

function parseSchemaModels(src: string): Array<{ name: string; hasTenantId: boolean }> {
  const out: Array<{ name: string; hasTenantId: boolean }> = []
  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  let m: RegExpExecArray | null
  while ((m = modelRe.exec(src)) !== null) {
    const name = m[1]
    const body = m[2]
    const hasTenantId = /^\s*tenantId\s+/m.test(body)
    out.push({ name, hasTenantId })
  }
  return out
}

function parseLibTenants(src: string): { scoped: Set<string>; nullable: Set<string> } {
  const pickList = (label: string): Set<string> => {
    const re = new RegExp(`export const ${label}\\s*=\\s*\\[([\\s\\S]*?)\\]`)
    const match = src.match(re)
    if (!match) die(`audit-tenant: could not parse ${label} in lib/tenants.ts`)
    const names = [...match[1].matchAll(/'([A-Za-z_][A-Za-z0-9_]*)'/g)].map((x) => x[1])
    return new Set(names)
  }
  return {
    scoped: pickList('TENANT_SCOPED_MODELS'),
    nullable: pickList('TENANT_NULLABLE_MODELS'),
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (entry === 'route.ts') out.push(p)
  }
  return out
}

function main(): void {
  console.log('A-003 · Tenant-isolation audit (D-023)')

  // ── 1. Schema ↔ allow-list sync ──
  const schema = readFileSync(SCHEMA, 'utf8')
  const models = parseSchemaModels(schema)
  const schemaWithTenant = models.filter((m) => m.hasTenantId).map((m) => m.name)

  const tenantsSrc = readFileSync(TENANTS_LIB, 'utf8')
  const { scoped, nullable } = parseLibTenants(tenantsSrc)
  const allowed = new Set<string>([...scoped, ...nullable])

  const missing = schemaWithTenant.filter((name) => !allowed.has(name))
  const extra = [...allowed].filter((name) => !schemaWithTenant.includes(name))

  console.log(`  schema:      ${schemaWithTenant.length} models with tenantId`)
  console.log(`  lib/tenants: ${scoped.size} strict + ${nullable.size} nullable`)

  if (missing.length) {
    console.error('\nSchema has tenantId but lib/tenants.ts does NOT list:')
    for (const m of missing) console.error(`  - ${m}`)
    console.error(
      '\nAdd each missing model to TENANT_SCOPED_MODELS (NOT NULL) or ' +
      'TENANT_NULLABLE_MODELS (nullable) in lib/tenants.ts.',
    )
    process.exit(1)
  }
  if (extra.length) {
    console.error('\nlib/tenants.ts lists models that do NOT have tenantId in schema:')
    for (const m of extra) console.error(`  - ${m}`)
    process.exit(1)
  }
  console.log('  OK — schema and lib/tenants.ts agree')

  // ── 2. Route-level scoping discipline ──
  const routes = walk(API_DIR)
  const violations: string[] = []

  for (const file of routes) {
    const rel = file.replace(ROOT + '/', '')
    if (INTENTIONAL_PUBLIC_ROUTES.has(rel)) continue

    const src = readFileSync(file, 'utf8')
    const usesPrisma =
      /from\s+['"]@\/lib\/db['"]/.test(src) ||
      /from\s+['"]@prisma\/client['"]/.test(src) ||
      /getPrisma\s*\(/.test(src)
    if (!usesPrisma) continue

    const usesTenantHelper =
      /from\s+['"]@\/lib\/tenants['"]/.test(src) ||
      /withTenantContext\s*\(/.test(src) ||
      /runPlatformOp\s*\(/.test(src) ||
      /runAuthed\s*\(/.test(src)

    if (!usesTenantHelper) {
      violations.push(rel)
    }
  }

  console.log(`  routes scanned: ${routes.length}`)
  console.log(`  routes using prisma without tenant helper: ${violations.length}`)

  if (violations.length) {
    console.error('\nRoutes using prisma without a tenant helper:')
    for (const v of violations) console.error(`  - ${v}`)
    console.error(
      '\nWrap the prisma call in withTenantContext() or runPlatformOp(), ' +
      'or add the route to INTENTIONAL_PUBLIC_ROUTES in this script if ' +
      'it is a verified public webhook.',
    )
    process.exit(1)
  }

  console.log('\nOK — no tenant-isolation violations.')
}

main()
