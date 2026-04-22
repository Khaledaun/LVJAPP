/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import { on, off, dispatch, clearAllHandlers, listHandlers } from '@/lib/events'

describe('lib/events — multi-channel event bus', () => {
  beforeEach(() => {
    clearAllHandlers()
  })

  it('invokes every registered handler in parallel (Promise.allSettled semantics)', async () => {
    const calls: string[] = []
    on('notification.dispatch', 'email', async () => { calls.push('email') })
    on('notification.dispatch', 'sms',   async () => { calls.push('sms') })
    on('notification.dispatch', 'push',  async () => { calls.push('push') })

    const results = await dispatch('notification.dispatch', { body: 'hi' })

    expect(results).toHaveLength(3)
    expect(results.every(r => r.status === 'ok')).toBe(true)
    expect(calls.sort()).toEqual(['email', 'push', 'sms'])
  })

  it('never throws when a handler fails — partial failure is isolated', async () => {
    on('notification.dispatch', 'good',    async () => {})
    on('notification.dispatch', 'broken',  async () => { throw new Error('whatsapp down') })
    on('notification.dispatch', 'another', async () => {})

    const results = await dispatch('notification.dispatch', { body: 'x' })

    expect(results).toHaveLength(3)
    const byId = Object.fromEntries(results.map(r => [r.handler, r]))
    expect(byId.good.status).toBe('ok')
    expect(byId.another.status).toBe('ok')
    expect(byId.broken.status).toBe('error')
    expect(byId.broken.error).toContain('whatsapp down')
  })

  it('off() removes a specific handler by id', async () => {
    on('case.created', 'a', () => {})
    on('case.created', 'b', () => {})
    off('case.created', 'a')
    expect(listHandlers('case.created')).toEqual(['b'])
  })

  it('dispatches to an event with no handlers without error', async () => {
    const results = await dispatch('case.created', { id: 'c1' })
    expect(results).toEqual([])
  })

  it('propagates caseId and userId into the event envelope', async () => {
    const received: any[] = []
    on('case.status_changed', 'spy', evt => { received.push(evt) })

    await dispatch('case.status_changed', { from: 'new', to: 'approved' }, { caseId: 'c42', userId: 'u7' })

    expect(received).toHaveLength(1)
    expect(received[0].caseId).toBe('c42')
    expect(received[0].userId).toBe('u7')
    expect(received[0].payload).toEqual({ from: 'new', to: 'approved' })
    expect(received[0].occurredAt).toBeInstanceOf(Date)
  })
})
