import { NextResponse } from 'next/server'
import { isDevNoDB } from '@/lib/dev'
import { getPrisma } from '@/lib/db'
import { runAuthed } from '@/lib/rbac-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(req: Request) {
  if (isDevNoDB) return NextResponse.json({ ok: true, accepted: true, version: 'mock' })

  return runAuthed('authed', async (user) => {
    const prisma = await getPrisma()
    // Carry session email / name into the User row.
    const dbUser = user.email
      ? await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: { email: user.email, role: 'CLIENT' },
        })
      : { id: user.id }
    const version = process.env.TERMS_VERSION ?? 'v1'
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || null

    await prisma.termsAcceptance.create({
      data: { userId: dbUser.id, version, ip: ip || undefined }
    })
    return NextResponse.json({ ok: true, accepted: true, version })
  })
}
