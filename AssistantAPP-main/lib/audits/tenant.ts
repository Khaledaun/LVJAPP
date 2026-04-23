/**
 * A-003 · Tenant-isolation audit (D-023) — library.
 *
 * Two checks:
 *   1. Schema ↔ allow-list sync. Every model with `tenantId` in
 *      `prisma/schema.prisma` must be listed in
 *      `TENANT_SCOPED_MODELS` or `TENANT_NULLABLE_MODELS` in
 *      `lib/tenants.ts`; the reverse must also hold.
 *   2. Route-level discipline. Every `app/api/` route importing
 *      prisma must also touch a tenant helper (withTenantContext /
 *      runPlatformOp / runAuthed), or be on INTENTIONAL_PUBLIC.
 *
 * Pure logic; the CLI wrapper and the nightly cron call this entry
 * point. See docs/DECISIONS.md D-023.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const INTENTIONAL_PUBLIC_ROUTES: readonly string[] = [
  'app/api/health/route.ts',
  'app/api/auth/[...nextauth]/route.ts',
  'app/api/signup/route.ts',
  'app/api/terms/latest/route.ts',
  'app/api/webhooks/webflow/route.ts',
]

export interface SchemaSummary {
  modelsWithTenantId: string[]
  scopedInLib: string[]
  nullableInLib: string[]
  missingFromLib: string[]
  extraInLib: string[]
}

export interface AuditTenantResult {
  schema: SchemaSummary
  routesScanned: number
  violations: string[]
  ok: boolean
  schemaErrors: string[]
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

function parseLibTenants(src: string): { scoped: Set<string>; nullable: Set<string>; errors: string[] } {
  const errors: string[] = []
  const pickList = (label: string): Set<string> => {
    const re = new RegExp(`export const ${label}\\s*=\\s*\\[([\\s\\S]*?)\\]`)
    const match = src.match(re)
    if (!match) {
      errors.push(`audit-tenant: could not parse ${label} in lib/tenants.ts`)
      return new Set()
    }
    const names = [...match[1].matchAll(/'([A-Za-z_][A-Za-z0-9_]*)'/g)].map((x) => x[1])
    return new Set(names)
  }
  return {
    scoped: pickList('TENANT_SCOPED_MODELS'),
    nullable: pickList('TENANT_NULLABLE_MODELS'),
    errors,
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

export function runAuditTenant(opts: { root?: string } = {}): AuditTenantResult {
  const root = opts.root ?? process.cwd()
  const schemaPath = join(root, 'prisma/schema.prisma')
  const tenantsPath = join(root, 'lib/tenants.ts')
  const apiDir = join(root, 'app/api')

  const schemaSrc = readFileSync(schemaPath, 'utf8')
  const models = parseSchemaModels(schemaSrc)
  const modelsWithTenantId = models.filter((m) => m.hasTenantId).map((m) => m.name)

  const tenantsSrc = readFileSync(tenantsPath, 'utf8')
  const { scoped, nullable, errors: schemaErrors } = parseLibTenants(tenantsSrc)
  const allowed = new Set<string>([...scoped, ...nullable])

  const missingFromLib = modelsWithTenantId.filter((name) => !allowed.has(name))
  const extraInLib = [...allowed].filter((name) => !modelsWithTenantId.includes(name))

  const schema: SchemaSummary = {
    modelsWithTenantId,
    scopedInLib: [...scoped],
    nullableInLib: [...nullable],
    missingFromLib,
    extraInLib,
  }

  const routes = walk(apiDir)
  const violations: string[] = []
  const intentionalPublic = new Set(INTENTIONAL_PUBLIC_ROUTES)

  for (const file of routes) {
    const rel = file.replace(root + '/', '')
    if (intentionalPublic.has(rel)) continue

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

    if (!usesTenantHelper) violations.push(rel)
  }

  const ok =
    schemaErrors.length === 0 &&
    missingFromLib.length === 0 &&
    extraInLib.length === 0 &&
    violations.length === 0

  return {
    schema,
    routesScanned: routes.length,
    violations,
    ok,
    schemaErrors,
  }
}
