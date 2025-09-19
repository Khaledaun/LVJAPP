import { NextResponse } from 'next/server'
import { isDevNoDB, listMessagesMock, addMessageMock } from '@/lib/dev'
import { getPrisma } from '@/lib/db'
import { getAuthOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (isDevNoDB) {
      const items = listMessagesMock(params.id)
      return NextResponse.json({ items })
    }
    const prisma = await getPrisma()
    const rows = await prisma.message.findMany({
      where: { caseId: params.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, sender: true, body: true, createdAt: true },
    })
    const items = rows.map((r: any) => ({
      id: r.id,
      from: (r.sender === 'staff' ? 'staff' : 'client') as 'client'|'staff',
      text: r.body,
      at: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[messages][GET] error:', err)
    return NextResponse.json({ items: [], error: 'server-error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const text = String(body?.text ?? '').trim()
    if (!text) return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 })

    // Mock mode: append to mock store
    if (isDevNoDB) {
      const item = addMessageMock(params.id, 'client', text)
      return NextResponse.json({ ok: true, item })
    }

    // Live mode
    const session = await getServerSession(await getAuthOptions())
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
    }

    const prisma = await getPrisma()

    // Make sure case exists + get applicant email to infer role
    const kase = await prisma.case.findUnique({
      where: { id: params.id },
      select: { id: true, applicantEmail: true },
    })
    if (!kase) return NextResponse.json({ ok: false, reason: 'case-not-found' }, { status: 404 })

    // Ensure user exists
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: { name: session.user.name ?? null },
      create: { email: session.user.email, name: session.user.name ?? null, role: 'CLIENT' },
      select: { id: true, role: true, email: true },
    })

    // Infer sender: staff if role is STAFF OR email != applicantEmail; else client
    const isStaff = user.role === 'STAFF' || (
      kase.applicantEmail && kase.applicantEmail.toLowerCase() !== user.email.toLowerCase()
    )
    const sender: 'client'|'staff' = isStaff ? 'staff' : 'client'

    const created = await prisma.message.create({
      data: {
        caseId: params.id,
        sender,
        body: text,
      },
      select: { id: true, sender: true, body: true, createdAt: true },
    })

    // Touch case.updatedAt and write audit (best-effort)
    await prisma.$transaction([
      prisma.case.update({ where: { id: params.id }, data: { updatedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          caseId: params.id,
          userId: user.id,
          action: 'message.sent',
          diff: { sender, text },
        },
      }),
    ])

    const item = {
      id: created.id,
      from: created.sender as 'client'|'staff',
      text: created.body,
      at: created.createdAt.toISOString(),
    }
    return NextResponse.json({ ok: true, item })
  } catch (err: any) {
    console.error('[messages][POST] error:', { name: err?.name, code: err?.code || err?.clientVersion, message: err?.message })
    return NextResponse.json({ ok: false, reason: 'server-error', message: err?.message || String(err) }, { status: 500 })
  }
}
