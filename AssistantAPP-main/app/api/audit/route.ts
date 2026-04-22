import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { guardCaseAccess, guardStaff } from '@/lib/rbac-http'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 20)

  // If the caller filters by case, scope to that case; otherwise require staff.
  if (caseId) {
    const g = await guardCaseAccess(caseId)
    if (!g.ok) return g.response
  } else {
    const g = await guardStaff()
    if (!g.ok) return g.response
  }

  const prisma = await getPrisma()
  const where: any = {}
  if (caseId) where.caseId = caseId

  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { at: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  })
  return NextResponse.json({ items })
}
