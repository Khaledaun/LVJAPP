import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { isDevNoDB } from '@/lib/dev'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  if (isDevNoDB) {
    return NextResponse.json({
      items: [
        { id: 'u_staff_mock_1', name: 'LVJ Staff', email: 'demo@lvj.local' },
        { id: 'u_staff_mock_2', name: 'Case Manager', email: 'case@lvj.local' },
      ],
    })
  }
  const prisma = await getPrisma()
  const users = await prisma.user.findMany({
    where: { role: 'STAFF' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ items: users })
}
