import { NextResponse } from 'next/server'
import { isDevNoDB } from '@/lib/dev'
import { getPrisma } from '@/lib/db'
import { runAuthed } from '@/lib/rbac-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  if (isDevNoDB) return NextResponse.json({ accepted: true, version: 'mock' })

  return runAuthed('authed', async (user) => {
    const prisma = await getPrisma()
    const dbUser = user.email
      ? await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: { email: user.email, role: 'CLIENT' },
        })
      : { id: user.id }

    const version = process.env.TERMS_VERSION ?? 'v1'
    const latest = await prisma.termsAcceptance.findFirst({
      where: { userId: dbUser.id },
      orderBy: { acceptedAt: 'desc' },
    })
    const accepted = latest?.version === version
    return NextResponse.json({ accepted, version })
  })
}
