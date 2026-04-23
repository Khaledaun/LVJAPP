/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  subscribeAgent,
  isSubscribed,
  listSubscribed,
  listRoutes,
  clearRoutes,
} from '@/lib/agents/orchestrator'
import { clearAllHandlers } from '@/lib/events'

// Pull manifests into the invoke registry.
import '@/lib/agents/register'

describe('lib/agents/orchestrator · subscribeAgent idempotency', () => {
  beforeEach(() => {
    clearRoutes()
    clearAllHandlers()
  })

  it('binds a known agent on first call', () => {
    expect(isSubscribed('intake')).toBe(false)
    subscribeAgent('intake')
    expect(isSubscribed('intake')).toBe(true)
    // intake has at least one trigger — the routes list grows.
    expect(listRoutes().length).toBeGreaterThan(0)
  })

  it('is a no-op on a second call for the same agent', () => {
    subscribeAgent('intake')
    const routesAfterFirst = listRoutes().length
    subscribeAgent('intake')
    const routesAfterSecond = listRoutes().length
    // Critical invariant: `on()` in lib/events.ts appends without
    // dedup, so a non-idempotent subscribe would double the handlers
    // and fire every trigger twice. This test guards that.
    expect(routesAfterSecond).toBe(routesAfterFirst)
    expect(isSubscribed('intake')).toBe(true)
  })

  it('binds multiple distinct agents independently', () => {
    subscribeAgent('intake')
    subscribeAgent('drafting')
    subscribeAgent('email')
    expect(listSubscribed()).toEqual(['drafting', 'email', 'intake'])
  })

  it('throws on an unknown agent id', () => {
    expect(() => subscribeAgent('unknown-agent')).toThrow(/unknown agent/i)
    expect(isSubscribed('unknown-agent')).toBe(false)
  })

  it('clearRoutes wipes both routes and the subscribed set', () => {
    subscribeAgent('intake')
    expect(listSubscribed().length).toBe(1)
    clearRoutes()
    expect(listSubscribed().length).toBe(0)
    expect(listRoutes().length).toBe(0)
    // After clear, a fresh subscribe works again (proves the Set was
    // actually cleared, not just marked).
    subscribeAgent('intake')
    expect(isSubscribed('intake')).toBe(true)
  })
})
