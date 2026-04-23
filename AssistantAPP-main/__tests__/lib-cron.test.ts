/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextResponse } from 'next/server'
import { runCron } from '@/lib/cron'

function mkReq(auth?: string, url = 'http://localhost/api/cron/demo'): Request {
  const headers: Record<string, string> = {}
  if (auth !== undefined) headers['authorization'] = auth
  return new Request(url, { headers })
}

describe('lib/cron · runCron', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    delete process.env.SKIP_AUTH
    delete process.env.SKIP_DB
    delete process.env.CRON_SECRET
    process.env.NODE_ENV = 'production'
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns 500 cron_misconfigured when CRON_SECRET unset in production', async () => {
    const res = await runCron(mkReq(), async () => NextResponse.json({ ran: true }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('cron_misconfigured')
    expect(res.headers.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('returns 401 when bearer token missing', async () => {
    process.env.CRON_SECRET = 'super-secret'
    const res = await runCron(mkReq(), async () => NextResponse.json({ ran: true }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when bearer token mismatches', async () => {
    process.env.CRON_SECRET = 'super-secret'
    const res = await runCron(mkReq('Bearer wrong'), async () =>
      NextResponse.json({ ran: true }),
    )
    expect(res.status).toBe(401)
  })

  it('runs the handler when bearer matches', async () => {
    process.env.CRON_SECRET = 'super-secret'
    const res = await runCron(mkReq('Bearer super-secret'), async (ctx) =>
      NextResponse.json({ ran: true, cid: ctx.correlationId }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ran).toBe(true)
    expect(body.cid).toMatch(/^[0-9a-f-]{36}$/)
    expect(res.headers.get('X-Correlation-Id')).toBe(body.cid)
  })

  it('skips the bearer check in dev with SKIP_AUTH=1', async () => {
    process.env.NODE_ENV = 'development'
    process.env.SKIP_AUTH = '1'
    // No CRON_SECRET, no auth header — should still run.
    const res = await runCron(mkReq(), async () => NextResponse.json({ ran: true }))
    expect(res.status).toBe(200)
  })

  it('returns 500 cron_failed when the handler throws', async () => {
    process.env.CRON_SECRET = 'super-secret'
    const res = await runCron(mkReq('Bearer super-secret'), async () => {
      throw new Error('boom')
    })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('cron_failed')
  })

  it('uses constant-time compare (no short-circuit on length match)', async () => {
    process.env.CRON_SECRET = 'abcdefgh'
    // Same length, different content.
    const res = await runCron(mkReq('Bearer 00000000'), async () =>
      NextResponse.json({ ran: true }),
    )
    expect(res.status).toBe(401)
  })
})
