import { NextResponse } from 'next/server'
import { isDevNoDB } from '@/lib/dev'
import { getPrisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  if (isDevNoDB) return NextResponse.json({ accepted: true, version: 'mock' })
  const session = await getServerSession(await getAuthOptions())
  if (!session?.user?.email) return NextResponse.json({ accepted: false }, { status: 401 })

  const prisma = await getPrisma()
  // Ensure there is a user row for this email
  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: { name: session.user.name ?? null },
    create: { email: session.user.email, name: session.user.name ?? null, role: 'CLIENT' }
  })

  const version = process.env.TERMS_VERSION ?? 'v1'
  const latest = await prisma.termsAcceptance.findFirst({
    where: { userId: user.id },
    orderBy: { acceptedAt: 'desc' },
  })
  const accepted = latest?.version === version
  return NextResponse.json({ accepted, version })
}
