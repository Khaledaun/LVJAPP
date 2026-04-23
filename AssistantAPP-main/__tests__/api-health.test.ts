/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock getPrisma BEFORE importing the route.
const queryRawMock = jest.fn()
jest.mock('@/lib/db', () => ({
  getPrisma: async () => ({
    $queryRaw: (...args: any[]) => queryRawMock(...args),
  }),
}))

// Route is imported dynamically inside each test so the mock is in
// place before module evaluation.
async function loadRoute() {
  // Clear the module from the require cache so `SKIP_DB` is re-read
  // each time. Next.js / jest cache module-level consts.
  jest.resetModules()
  return await import('@/app/api/health/route')
}

describe('app/api/health · 503 on DB down, 200 otherwise', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    process.env = { ...origEnv }
    delete process.env.SKIP_DB
    queryRawMock.mockReset()
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('returns 200 { ok: true, db: "ok" } when the DB query succeeds', async () => {
    queryRawMock.mockResolvedValueOnce([{ '?column?': 1 }])
    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(
      expect.objectContaining({ ok: true, db: 'ok', time: expect.any(String) }),
    )
  })

  it('returns 503 { ok: false, db: "error" } when the DB query throws', async () => {
    queryRawMock.mockRejectedValueOnce(new Error('connection refused'))
    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toEqual(
      expect.objectContaining({ ok: false, db: 'error' }),
    )
  })

  it('returns 200 { ok: true, db: "skipped" } when SKIP_DB=1 (dev loop)', async () => {
    process.env.SKIP_DB = '1'
    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.db).toBe('skipped')
    expect(body.ok).toBe(true)
    // Must NOT call the DB.
    expect(queryRawMock).not.toHaveBeenCalled()
  })

  it('does not leak env detail in the public payload', async () => {
    queryRawMock.mockResolvedValueOnce([{ ok: 1 }])
    const { GET } = await loadRoute()
    const res = await GET()
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(['db', 'ok', 'time'])
  })
})
