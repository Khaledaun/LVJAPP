import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Public health endpoint.
//
// `db: 'skipped'` — `SKIP_DB=1` dev loop; intentional. Status 200.
// `db: 'ok'`      — Prisma `SELECT 1` round-trip succeeded. Status 200.
// `db: 'error'`   — Prisma threw. Status **503**. Uptime monitors
//                   (UptimeRobot etc.) key off the status code, not the
//                   JSON field — `{ ok: true, db: 'error' }` with 200
//                   would silently stay green on their dashboards.
//
// Intentionally minimal payload: public = no PII, no env detail, no
// deploy metadata. The staff-guarded `/api/status` carries the rest.

const SKIP_DB = process.env.SKIP_DB === '1'

export async function GET() {
  let db: 'ok' | 'error' | 'skipped' = 'skipped'
  if (!SKIP_DB) {
    try {
      const prisma = await getPrisma()
      await prisma.$queryRaw`SELECT 1`
      db = 'ok'
    } catch {
      db = 'error'
    }
  }
  const ok = db !== 'error'
  return NextResponse.json(
    { ok, db, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  )
}
