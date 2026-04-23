// Sprint 0.5 · D-023 — lib/tenants.ts unit tests.
//
// Strategy: mock the Prisma `$extends` surface with a query dispatcher
// and drive it through buildTenantExtension(). Assertions verify the
// scoped args the middleware produces vs what the caller passed in.

import {
  buildTenantExtension,
  withTenantContext,
  runPlatformOp,
  assertTenantAccess,
  TENANT_SCOPED_MODELS,
  TENANT_NULLABLE_MODELS,
} from '@/lib/tenants'

// ──────────────────────────────────────────────────────
// Mini Prisma-like fake that just captures what the middleware hands it.
// `$extends({ query: { $allModels: { $allOperations(...) } } })` is the
// surface Prisma v6 exposes. We mirror just enough of it.
// ──────────────────────────────────────────────────────

type Captured = {
  model: string
  operation: string
  args: any
  result: any
}

function makeFakePrisma(lastOp: { current?: Captured } = {}) {
  const handler = (model: string) => ({
    findMany: (args: any) => dispatch(model, 'findMany', args),
    findUnique: (args: any) => dispatch(model, 'findUnique', args),
    findFirst: (args: any) => dispatch(model, 'findFirst', args),
    count: (args: any) => dispatch(model, 'count', args),
    create: (args: any) => dispatch(model, 'create', args),
    createMany: (args: any) => dispatch(model, 'createMany', args),
    update: (args: any) => dispatch(model, 'update', args),
    updateMany: (args: any) => dispatch(model, 'updateMany', args),
    upsert: (args: any) => dispatch(model, 'upsert', args),
    delete: (args: any) => dispatch(model, 'delete', args),
    deleteMany: (args: any) => dispatch(model, 'deleteMany', args),
  })

  // Every dispatch goes through the extension's $allOperations. We
  // simulate that by letting the extension call `query(args)`.
  // $allOperations is set below after $extends is invoked.
  let allOps: any = null

  const dispatch = async (model: string, operation: string, args: any) => {
    // When the extension wraps us, `query` is the next layer. For the
    // fake we just return what the extension handed us.
    const runner = async (finalArgs: any) => {
      const captured: Captured = { model, operation, args: finalArgs, result: { ok: true } }
      lastOp.current = captured
      return captured.result
    }
    if (!allOps) return runner(args)
    return allOps({ model, operation, args, query: runner })
  }

  const client: any = {
    case:               handler('Case'),
    caseDeadline:       handler('CaseDeadline'),
    caseOutcome:        handler('CaseOutcome'),
    document:           handler('Document'),
    office:             handler('Office'),
    partner:            handler('Partner'),
    message:            handler('Message'),
    user:               handler('User'),
    auditLog:           handler('AuditLog'),
    tenant:             handler('Tenant'),
    partnerRole:        handler('PartnerRole'),
    tenantContract:     handler('TenantContract'),
    $extends(conf: any) {
      allOps = conf?.query?.$allModels?.$allOperations
      return client
    },
  }
  return client
}

function extended() {
  const last: { current?: Captured } = {}
  const raw = makeFakePrisma(last)
  const client = buildTenantExtension()(raw)
  return { client, last }
}

// ──────────────────────────────────────────────────────
// Test doubles for session users
// ──────────────────────────────────────────────────────

const tenantUser = { id: 'u1', role: 'CLIENT', tenantId: 'tenant_A' }
const otherTenantUser = { id: 'u2', role: 'CLIENT', tenantId: 'tenant_B' }
const platformUser = { id: 'p1', role: 'LVJ_ADMIN', tenantId: null as string | null }

// ──────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────

describe('TENANT_SCOPED_MODELS / TENANT_NULLABLE_MODELS', () => {
  it('allow-lists are disjoint (no model in both)', () => {
    const s = new Set<string>(TENANT_SCOPED_MODELS)
    for (const n of TENANT_NULLABLE_MODELS) expect(s.has(n)).toBe(false)
  })
})

describe('tenant context propagation', () => {
  it('throws on scoped model when called without any context', async () => {
    const { client } = extended()
    await expect(client.case.findMany({})).rejects.toThrow(/without tenant context/)
  })

  it('passes PartnerRole / Tenant through untouched (not scoped)', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.partnerRole.findMany({ where: { name: 'x' } })
    })
    expect(last.current?.model).toBe('PartnerRole')
    expect(last.current?.args).toEqual({ where: { name: 'x' } })
  })
})

describe('read-side scoping (strict models)', () => {
  it('injects tenantId into findMany where', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.case.findMany({ where: { title: 'foo' } })
    })
    expect(last.current?.args.where).toEqual({ title: 'foo', tenantId: 'tenant_A' })
  })

  it('injects tenantId when no where supplied', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.case.findMany({})
    })
    expect(last.current?.args.where).toEqual({ tenantId: 'tenant_A' })
  })

  it('preserves nested AND clauses', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.case.findMany({ where: { AND: [{ title: 'x' }] } })
    })
    const w = last.current?.args.where
    expect(w.AND).toContainEqual({ tenantId: 'tenant_A' })
    expect(w.AND).toContainEqual({ title: 'x' })
  })

  it('applies to update / delete / count', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.case.updateMany({ where: { title: 't' }, data: { title: 'u' } })
    })
    expect(last.current?.args.where).toEqual({ title: 't', tenantId: 'tenant_A' })
  })
})

describe('write-side scoping (strict models)', () => {
  it('auto-injects tenantId on create', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.case.create({ data: { title: 'x' } })
    })
    expect(last.current?.args.data).toEqual({ title: 'x', tenantId: 'tenant_A' })
  })

  it('rejects cross-tenant data.tenantId on create', async () => {
    const { client } = extended()
    await expect(
      withTenantContext(tenantUser, async () => {
        await client.case.create({ data: { title: 'x', tenantId: 'tenant_B' } })
      }),
    ).rejects.toThrow(/cross-tenant write/)
  })

  it('refuses to mutate tenantId in an upsert update clause', async () => {
    const { client } = extended()
    await expect(
      withTenantContext(tenantUser, async () => {
        await client.case.upsert({
          where: { id: 'c1' },
          create: { title: 't' },
          update: { tenantId: 'tenant_B' },
        })
      }),
    ).rejects.toThrow(/mutates tenantId/)
  })
})

describe('platform bypass', () => {
  it('plain withTenantContext(platformUser) refuses writes to scoped models', async () => {
    const { client } = extended()
    await expect(
      withTenantContext(platformUser, async () => {
        await client.case.create({ data: { title: 'x', tenantId: 'tenant_A' } })
      }),
    ).rejects.toThrow(/platform staff outside runPlatformOp/)
  })

  it('runPlatformOp lets platform reads pass through unfiltered', async () => {
    const { client, last } = extended()
    await runPlatformOp(platformUser as any, 'test.cross_tenant_read', async () => {
      await client.case.findMany({ where: { title: 'foo' } })
    })
    // Not scoped — no tenantId injected.
    expect(last.current?.args.where).toEqual({ title: 'foo' })
  })

  it('runPlatformOp still requires tenantId on create', async () => {
    const { client } = extended()
    await expect(
      runPlatformOp(platformUser as any, 'test.platform_write', async () => {
        await client.case.create({ data: { title: 'x' } })
      }),
    ).rejects.toThrow(/Platform write missing tenantId/)
  })

  it('runPlatformOp rejects non-platform users', async () => {
    await expect(
      runPlatformOp(tenantUser as any, 'test.noop', async () => {}),
    ).rejects.toThrow(/not platform staff/)
  })

  it('runPlatformOp rejects empty reason', async () => {
    await expect(
      runPlatformOp(platformUser as any, '', async () => {}),
    ).rejects.toThrow(/reason must be/)
  })
})

describe('cross-tenant isolation (adversarial)', () => {
  it('tenantA context cannot read tenantB by supplying tenantId=B in where', async () => {
    const { client, last } = extended()
    await withTenantContext(tenantUser, async () => {
      await client.case.findMany({ where: { tenantId: 'tenant_B' } })
    })
    // Middleware's mergeWhereTenant overrides, locking to tenant_A.
    expect(last.current?.args.where.tenantId).toBe('tenant_A')
  })

  it('tenantA context cannot create a row claiming tenantId=B', async () => {
    const { client } = extended()
    await expect(
      withTenantContext(tenantUser, async () => {
        await client.case.create({ data: { title: 'x', tenantId: 'tenant_B' } })
      }),
    ).rejects.toThrow(/cross-tenant/)
  })

  it('assertTenantAccess allows same-tenant', () => {
    expect(() => assertTenantAccess('tenant_A', tenantUser as any)).not.toThrow()
  })

  it('assertTenantAccess rejects other tenant', () => {
    expect(() => assertTenantAccess('tenant_A', otherTenantUser as any)).toThrow(/no tenant access/)
  })

  it('assertTenantAccess always allows platform staff', () => {
    expect(() => assertTenantAccess('tenant_A', platformUser as any)).not.toThrow()
  })
})
