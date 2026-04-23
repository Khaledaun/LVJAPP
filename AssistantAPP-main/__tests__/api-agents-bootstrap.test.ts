/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import { GET, POST } from '@/app/api/agents/bootstrap/route'
import { clearRoutes } from '@/lib/agents/orchestrator'
import { clearAllHandlers } from '@/lib/events'

// Force the runAuthed test bypass — SKIP_AUTH=1 is handled in
// lib/rbac-http and lib/rbac.ts. With it unset the real NextAuth
// path kicks in and the route would try to read cookies; we want
// a unit-level check, so pin it up-front.
function stubReq(method: 'GET' | 'POST' = 'POST'): Request {
  return new Request('http://localhost/api/agents/bootstrap', { method })
}

describe('app/api/agents/bootstrap', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    process.env = { ...origEnv }
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    process.env.SKIP_DB = '1'
    delete process.env.AGENT_INTAKE_ENABLED
    delete process.env.AGENT_DRAFTING_ENABLED
    delete process.env.AGENT_EMAIL_ENABLED
    clearRoutes()
    clearAllHandlers()
  })

  it('POST with no flags returns { bootstrapped: [] } (safe default)', async () => {
    const res = await POST(stubReq('POST'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.bootstrapped).toEqual([])
    expect(body.skippedDisabled).toEqual(['intake', 'drafting', 'email'])
    expect(body.subscribed).toEqual([])
  })

  it('POST with AGENT_INTAKE_ENABLED=1 subscribes intake and reports it', async () => {
    process.env.AGENT_INTAKE_ENABLED = '1'
    const res = await POST(stubReq('POST'))
    const body = await res.json()
    expect(body.bootstrapped).toEqual(['intake'])
    expect(body.skippedDisabled).toEqual(['drafting', 'email'])
    expect(body.subscribed).toEqual(['intake'])
  })

  it('POST is idempotent — second call reports skippedAlreadyBound', async () => {
    process.env.AGENT_INTAKE_ENABLED = '1'
    await POST(stubReq('POST'))
    const res = await POST(stubReq('POST'))
    const body = await res.json()
    expect(body.bootstrapped).toEqual([])
    expect(body.skippedAlreadyBound).toEqual(['intake'])
    expect(body.subscribed).toEqual(['intake'])
  })

  it('POST binds multiple flag-enabled agents in one call', async () => {
    process.env.AGENT_INTAKE_ENABLED = '1'
    process.env.AGENT_DRAFTING_ENABLED = 'true'
    process.env.AGENT_EMAIL_ENABLED = 'yes'
    const res = await POST(stubReq('POST'))
    const body = await res.json()
    expect(body.bootstrapped.sort()).toEqual(['drafting', 'email', 'intake'])
    expect(body.subscribed).toEqual(['drafting', 'email', 'intake'])
  })

  it('POST accepts `1` / `true` / `yes` (case-insensitive) as truthy, rejects anything else', async () => {
    process.env.AGENT_INTAKE_ENABLED = 'TRUE'
    process.env.AGENT_DRAFTING_ENABLED = 'Yes'
    process.env.AGENT_EMAIL_ENABLED = 'false'
    const res = await POST(stubReq('POST'))
    const body = await res.json()
    expect(body.bootstrapped.sort()).toEqual(['drafting', 'intake'])
    expect(body.skippedDisabled).toEqual(['email'])
  })

  it('GET is introspection-only — reports flag/subscription state without binding', async () => {
    process.env.AGENT_INTAKE_ENABLED = '1'
    const res = await GET(stubReq('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.agents)).toBe(true)
    const intake = body.agents.find((a: any) => a.id === 'intake')
    expect(intake).toEqual(
      expect.objectContaining({
        id: 'intake',
        known: true,
        featureFlag: 'AGENT_INTAKE_ENABLED',
        featureFlagEnabled: true,
        subscribed: false, // GET does NOT subscribe
      }),
    )
    // GET did not mutate state.
    expect(body.subscribed).toEqual([])
  })

  it('GET after POST reflects the subscription', async () => {
    process.env.AGENT_INTAKE_ENABLED = '1'
    await POST(stubReq('POST'))
    const res = await GET(stubReq('GET'))
    const body = await res.json()
    expect(body.subscribed).toEqual(['intake'])
    const intake = body.agents.find((a: any) => a.id === 'intake')
    expect(intake.subscribed).toBe(true)
  })

  it('force-dynamic + revalidate=0 are declared on the route (A-005)', async () => {
    const mod = await import('@/app/api/agents/bootstrap/route')
    expect((mod as any).dynamic).toBe('force-dynamic')
    expect((mod as any).revalidate).toBe(0)
  })
})
