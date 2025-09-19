import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { assertCaseAccess } from '@/lib/rbac'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await assertCaseAccess(params.id)
  const prisma = await getPrisma()
  const items = await prisma.document.findMany({
    where: { caseId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items })
}
