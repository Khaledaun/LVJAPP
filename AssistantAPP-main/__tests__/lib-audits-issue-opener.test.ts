/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { openAuditIssue } from '@/lib/audits/issue-opener'

const INPUT = {
  auditId: 'a002',
  title: '[a002] UNAUTHED route: app/api/x/route.ts',
  body: 'Finding body — reproducer, owner, severity.',
  correlationId: '11111111-2222-3333-4444-555555555555',
}

describe('lib/audits/issue-opener · openAuditIssue', () => {
  const origEnv = { ...process.env }
  const origFetch = globalThis.fetch
  let logSpy: ReturnType<typeof jest.spyOn>
  let errSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY
    delete process.env.CRON_ISSUE_OPENER_REPO
    delete process.env.GITHUB_ISSUE_OPENER_MODE
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    process.env = { ...origEnv }
    globalThis.fetch = origFetch
    logSpy.mockRestore()
    errSpy.mockRestore()
  })

  it('returns { opened: false, reason: no_token } and logs a would-open line when GITHUB_TOKEN is unset', async () => {
    process.env.GITHUB_REPOSITORY = 'acme/repo'
    const res = await openAuditIssue(INPUT)
    expect(res).toEqual({ opened: false, reason: 'no_token', detail: 'GITHUB_TOKEN unset' })
    expect(logSpy).toHaveBeenCalled()
    const msg = String(logSpy.mock.calls[0][0])
    expect(msg).toContain('[issue-opener] would open')
    expect(msg).toContain('[a002]')
    expect(msg).toContain(INPUT.correlationId)
  })

  it('returns { opened: false, reason: no_token } when GITHUB_REPOSITORY is unset, even with a token', async () => {
    process.env.GITHUB_TOKEN = 't0ken'
    const res = await openAuditIssue(INPUT)
    expect(res.opened).toBe(false)
    if (!res.opened) {
      expect(res.reason).toBe('no_token')
      expect(res.detail).toMatch(/GITHUB_REPOSITORY/)
    }
  })

  it('respects GITHUB_ISSUE_OPENER_MODE=dry even with a token configured', async () => {
    process.env.GITHUB_TOKEN = 't0ken'
    process.env.GITHUB_REPOSITORY = 'acme/repo'
    process.env.GITHUB_ISSUE_OPENER_MODE = 'dry'

    const fetchSpy = jest.fn() as unknown as typeof fetch
    globalThis.fetch = fetchSpy
    const res = await openAuditIssue(INPUT)
    expect(res).toEqual({ opened: false, reason: 'dry_run' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('opens a fresh issue via POST /issues when no duplicate exists', async () => {
    process.env.GITHUB_TOKEN = 't0ken'
    process.env.GITHUB_REPOSITORY = 'acme/repo'

    const calls: Array<{ url: string; init?: RequestInit }> = []
    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (String(url).includes('/issues?')) {
        return new Response(JSON.stringify([]), { status: 200 })
      }
      if (String(url).endsWith('/issues')) {
        return new Response(
          JSON.stringify({ number: 42, html_url: 'https://github.com/acme/repo/issues/42' }),
          { status: 201 },
        )
      }
      return new Response('', { status: 500 })
    }) as unknown as typeof fetch

    const res = await openAuditIssue(INPUT)
    expect(res).toEqual({
      opened: true,
      number: 42,
      url: 'https://github.com/acme/repo/issues/42',
    })
    expect(calls).toHaveLength(2)
    expect(calls[0].url).toContain('/issues?')
    expect(calls[0].url).toContain('labels=cron-audit%2Ca002')
    const created = JSON.parse(String(calls[1].init?.body))
    expect(created.title).toBe(INPUT.title)
    expect(created.labels).toEqual(['cron-audit', 'a002'])
    expect(created.body).toContain(INPUT.body)
    expect(created.body).toContain(INPUT.correlationId)
  })

  it('short-circuits to duplicate + comments on the existing issue when a match is found', async () => {
    process.env.GITHUB_TOKEN = 't0ken'
    process.env.GITHUB_REPOSITORY = 'acme/repo'

    const calls: Array<{ url: string; init?: RequestInit }> = []
    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (String(url).includes('/issues?')) {
        return new Response(
          JSON.stringify([
            { number: 99, title: INPUT.title, html_url: 'https://github.com/acme/repo/issues/99' },
          ]),
          { status: 200 },
        )
      }
      if (String(url).includes('/comments')) {
        return new Response('{}', { status: 201 })
      }
      // Any other call is wrong — tests that we didn't POST a duplicate issue.
      return new Response('unexpected', { status: 500 })
    }) as unknown as typeof fetch

    const res = await openAuditIssue(INPUT)
    expect(res).toEqual({ opened: false, reason: 'duplicate', detail: 'existing #99' })
    expect(calls.some((c) => c.url.includes('/issues/99/comments'))).toBe(true)
    expect(calls.some((c) => c.url.endsWith('/issues') && c.init?.method === 'POST')).toBe(false)
  })

  it('surfaces api_error on a non-2xx create response', async () => {
    process.env.GITHUB_TOKEN = 't0ken'
    process.env.GITHUB_REPOSITORY = 'acme/repo'

    globalThis.fetch = (async (url: any) => {
      if (String(url).includes('/issues?')) return new Response('[]', { status: 200 })
      return new Response('forbidden', { status: 403 })
    }) as unknown as typeof fetch

    const res = await openAuditIssue(INPUT)
    expect(res.opened).toBe(false)
    if (!res.opened) {
      expect(res.reason).toBe('api_error')
      expect(res.detail).toMatch(/403/)
    }
  })
})
