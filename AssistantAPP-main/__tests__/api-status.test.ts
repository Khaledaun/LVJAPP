/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { GET } from '@/app/api/status/route'
import { clearRoutes } from '@/lib/agents/orchestrator'
import { clearAllHandlers } from '@/lib/events'

function mkReq(): Request {
  return new Request('http://localhost/api/status', { method: 'GET' })
}

describe('app/api/status · staff introspection', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...origEnv }
    // SKIP_AUTH so runAuthed short-circuits at unit level; we're not
    // testing rbac-http here.
    process.env.SKIP_AUTH = '1'
    process.env.SKIP_DB = '1'
    process.env.NODE_ENV = 'development'
    delete process.env.AGENT_INTAKE_ENABLED
    delete process.env.AGENT_DRAFTING_ENABLED
    delete process.env.AGENT_EMAIL_ENABLED
    delete process.env.CSRF_MODE
    delete process.env.RATE_LIMIT_MODE
    delete process.env.VERCEL_GIT_COMMIT_SHA
    clearRoutes()
    clearAllHandlers()
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns 200 with the core introspection payload', async () => {
    const res = await GET(mkReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.time).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.environment).toBe('development')
    expect(body.env).toEqual(
      expect.objectContaining({
        errors: expect.any(Array),
        warnings: expect.any(Array),
      }),
    )
    expect(body.flags).toEqual({ csrfMode: 'off', rateLimitMode: 'off' })
    expect(Array.isArray(body.agents.known)).toBe(true)
    expect(body.agents.known).toHaveLength(3)
  })

  it('reports dev environment with every env finding as a warning', async () => {
    const res = await GET(mkReq())
    const body = await res.json()
    expect(body.env.errors).toHaveLength(0)
    expect(body.env.warnings.length).toBeGreaterThan(0)
  })

  it('reflects CSRF_MODE / RATE_LIMIT_MODE live values', async () => {
    process.env.CSRF_MODE = 'enforce'
    process.env.RATE_LIMIT_MODE = 'report-only'
    const res = await GET(mkReq())
    const body = await res.json()
    expect(body.flags).toEqual({ csrfMode: 'enforce', rateLimitMode: 'report-only' })
  })

  it('reflects agent feature flags without subscribing them', async () => {
    process.env.AGENT_INTAKE_ENABLED = '1'
    const res = await GET(mkReq())
    const body = await res.json()
    const intake = body.agents.known.find((a: any) => a.id === 'intake')
    expect(intake.featureFlagEnabled).toBe(true)
    // GET /api/status must NOT subscribe — that's /api/agents/bootstrap's job.
    expect(intake.subscribed).toBe(false)
    expect(body.agents.subscribed).toEqual([])
  })

  it('reflects subscribed agents after a bootstrap call', async () => {
    const { subscribeAgent } = await import('@/lib/agents/orchestrator')
    subscribeAgent('intake')
    const res = await GET(mkReq())
    const body = await res.json()
    expect(body.agents.subscribed).toEqual(['intake'])
    const intake = body.agents.known.find((a: any) => a.id === 'intake')
    expect(intake.subscribed).toBe(true)
  })

  it('stamps gitSha from VERCEL_GIT_COMMIT_SHA when set', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'deadbeef1234567890'
    const res = await GET(mkReq())
    const body = await res.json()
    expect(body.gitSha).toBe('deadbeef1234567890')
  })

  it('returns gitSha: null when no commit env is set', async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA
    delete process.env.SOURCE_COMMIT
    delete process.env.GIT_COMMIT
    const res = await GET(mkReq())
    const body = await res.json()
    expect(body.gitSha).toBeNull()
  })

  it('returns ok: false when env has errors (simulated via prod + missing secrets)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.VERCEL_ENV = 'production'
    // SKIP_AUTH=1 is set so runAuthed still bypasses; validateEnv reads
    // real process.env and flags missing NEXTAUTH_SECRET + CRON_SECRET
    // as errors in prod.
    const res = await GET(mkReq())
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.env.errors.length).toBeGreaterThan(0)
    const errorKeys = body.env.errors.map((e: any) => e.key)
    expect(errorKeys).toContain('NEXTAUTH_SECRET')
    expect(errorKeys).toContain('CRON_SECRET')
  })

  it('declares force-dynamic + revalidate=0 (A-005)', async () => {
    const mod = await import('@/app/api/status/route')
    expect((mod as any).dynamic).toBe('force-dynamic')
    expect((mod as any).revalidate).toBe(0)
  })
})
