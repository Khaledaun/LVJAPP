import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  let db: 'ok' | 'error' | 'skipped' = 'skipped'
  try {
    const prisma = await getPrisma()
    await prisma.$queryRaw`SELECT 1`
    db = 'ok'
  } catch {
    db = 'error'
  }
  return NextResponse.json({ ok: true, db, time: new Date().toISOString() })
}
