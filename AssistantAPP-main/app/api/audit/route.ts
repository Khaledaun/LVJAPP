import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const prisma = await getPrisma()
  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 20)

  const where: any = {}
  if (caseId) where.caseId = caseId

  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { at: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  })
  return NextResponse.json({ items })
}
