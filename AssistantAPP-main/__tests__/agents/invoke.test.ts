/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

/**
 * Smoke test for the AOS invoke runtime using a synthetic agent.
 * Verifies:
 *  - tool allowlist enforcement
 *  - happy-path outcome + AutomationLog shape
 *  - circuit breaker trips after repeated failures
 *  - escalation bumps outcome to 'escalated'
 */

// Mock Prisma + audit + ai-router BEFORE importing the runtime.
jest.mock('@/lib/db', () => ({
  getPrisma: async () => ({
    automationLog: { create: jest.fn().mockResolvedValue({} as any) },
  }),
}))
jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined as any),
}))
jest.mock('@/lib/ai-router', () => {
  const actual = jest.requireActual('@/lib/ai-router') as any
  return {
    ...actual,
    routeAI: jest.fn(async (req: any) => ({
      output: 'mocked',
      model: 'gpt-5',
      tokensUsed: 42,
      durationMs: 1,
    })),
  }
})
jest.mock('@/lib/events', () => ({
  dispatch: jest.fn().mockResolvedValue([] as any),
}))

import * as breaker from '@/lib/agents/breaker'
import { invoke, register, unregister } from '@/lib/agents/invoke'
import type { AgentManifest } from '@/lib/agents/types'

function fakeManifest(overrides: Partial<AgentManifest> = {}): AgentManifest {
  return {
    id: 'fake',
    name: 'Fake Agent',
    version: '0.0.1',
    status: 'draft',
    owner: 'tests',
    tier: 'workflow',
    type: 'workflow',
    triggers: ['intake.submitted'],
    emits: [],
    toolsAllowed: [
      'lib/ai-router:routeAI',
      'lib/audit:logAuditEvent',
    ],
    models: ['email-draft'],
    rbacScope: { invoker: ['LVJ_ADMIN'], actsOnBehalfOf: ['CLIENT'] },
    vaultAccess: false,
    prismaWrites: [],
    humanGates: [],
    budgets: { maxCostUsd: 1, maxDurationMs: 5000, maxLlmCalls: 3 },
    escalationTriggers: ['escalation.urgent_deadline'],
    kpis: [],
    kb: { core: 'skills/core/SKILL.md', agent: 'skills/fake/SKILL.md' },
    featureFlag: 'AGENT_FAKE_ENABLED',
    ...overrides,
  }
}

describe('invoke runtime', () => {
  beforeEach(() => {
    process.env.AGENT_FAKE_ENABLED = '1'
    process.env.SKIP_DB = '1'
    breaker.reset()
  })

  it('runs the happy path and returns outcome=ok', async () => {
    register({
      manifest: fakeManifest(),
      runner: async (_in, _ctx, tools) => {
        await tools.routeAI({ task: 'email-draft', input: 'hello' })
        return { echoed: 'ok' }
      },
    })
    const r = await invoke('fake', { foo: 1 }, { triggerEvent: 'intake.submitted' })
    expect(r.outcome).toBe('ok')
    expect((r.output as any).echoed).toBe('ok')
    expect(r.acc.llmCalls).toBe(1)
    unregister('fake')
  })

  it('returns error when feature flag is off', async () => {
    delete process.env.AGENT_FAKE_ENABLED
    register({ manifest: fakeManifest(), runner: async () => ({}) })
    const r = await invoke('fake', {}, { triggerEvent: 'intake.submitted' })
    expect(r.outcome).toBe('error')
    expect(r.errorClass).toBe('feature_flag_off')
    unregister('fake')
  })

  it('rejects a tool not in toolsAllowed', async () => {
    register({
      manifest: fakeManifest({ toolsAllowed: ['lib/audit:logAuditEvent'] }), // no routeAI
      runner: async (_in, _ctx, tools) => {
        await tools.routeAI({ task: 'email-draft', input: 'x' })
        return {}
      },
    })
    const r = await invoke('fake', {}, { triggerEvent: 'intake.submitted' })
    expect(r.outcome).toBe('error')
    expect(r.errorClass).toBe('tool_not_allowed')
    unregister('fake')
  })

  it('bumps outcome to escalated when the agent escalates', async () => {
    register({
      manifest: fakeManifest(),
      runner: async (_in, _ctx, tools) => {
        await tools.escalate('escalation.urgent_deadline', { days: 3 })
        return {}
      },
    })
    const r = await invoke('fake', {}, { triggerEvent: 'intake.submitted' })
    expect(r.outcome).toBe('escalated')
    expect(r.acc.escalationEvents).toContain('escalation.urgent_deadline')
    unregister('fake')
  })

  it('short-circuits when the breaker is open', async () => {
    register({ manifest: fakeManifest(), runner: async () => ({}) })
    breaker.forceOpen('fake', 60_000)
    const r = await invoke('fake', {}, { triggerEvent: 'intake.submitted' })
    expect(r.outcome).toBe('circuit_broken')
    expect(r.errorClass).toBe('circuit_open')
    unregister('fake')
  })

  it('returns error for unknown agent', async () => {
    const r = await invoke('nonexistent', {}, { triggerEvent: 'intake.submitted' })
    expect(r.outcome).toBe('error')
    expect(r.errorClass).toBe('unknown_agent')
  })
})
