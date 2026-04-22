/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import * as breaker from '@/lib/agents/breaker'

describe('circuit breaker', () => {
  beforeEach(() => breaker.reset())

  it('starts closed', () => {
    expect(breaker.isOpen('x')).toBe(false)
  })

  it('requires MIN_SAMPLES before it can open', () => {
    // 5 errors — below threshold — must not open
    for (let i = 0; i < 5; i++) breaker.record('x', false)
    expect(breaker.isOpen('x')).toBe(false)
  })

  it('opens when error rate crosses threshold in the window', () => {
    // 10 samples, 3 errors → 30% > 20% threshold → opens
    for (let i = 0; i < 7; i++) breaker.record('x', true)
    for (let i = 0; i < 3; i++) breaker.record('x', false)
    expect(breaker.isOpen('x')).toBe(true)
  })

  it('stays closed when mostly successful', () => {
    for (let i = 0; i < 20; i++) breaker.record('y', true)
    breaker.record('y', false)
    expect(breaker.isOpen('y')).toBe(false)
  })

  it('forceOpen is a valid ops override', () => {
    breaker.forceOpen('z', 60000)
    expect(breaker.isOpen('z')).toBe(true)
  })
})
