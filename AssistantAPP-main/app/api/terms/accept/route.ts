import { NextResponse } from 'next/server'
import { isDevNoDB } from '@/lib/dev'
import { getPrisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { getAuthOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(req: Request) {
  if (isDevNoDB) return NextResponse.json({ ok: true, accepted: true, version: 'mock' })
  const session = await getServerSession(await getAuthOptions())
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const prisma = await getPrisma()
  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: { name: session.user.name ?? null },
    create: { email: session.user.email, name: session.user.name ?? null, role: 'CLIENT' }
  })
  const version = process.env.TERMS_VERSION ?? 'v1'
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || null

  await prisma.termsAcceptance.create({
    data: { userId: user.id, version, ip: ip || undefined }
  })
  return NextResponse.json({ ok: true, accepted: true, version })
}
