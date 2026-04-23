import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { runAuthed } from '@/lib/rbac-http'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 20)

  return runAuthed(caseId ? { caseId } : 'staff', async () => {
    const prisma = await getPrisma()
    const where: any = {}
    if (caseId) where.caseId = caseId

    const items = await prisma.auditLog.findMany({
      where,
      orderBy: { at: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    })
    return NextResponse.json({ items })
  })
}
