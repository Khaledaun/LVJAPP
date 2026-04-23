import { NextResponse } from 'next/server'
import { isDevNoDB, listMessagesMock, addMessageMock } from '@/lib/dev'
import { getPrisma } from '@/lib/db'
import { runAuthed } from '@/lib/rbac-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Mock mode bypasses auth to keep sandbox UX working without a session.
  if (isDevNoDB) {
    const items = listMessagesMock(params.id)
    return NextResponse.json({ items })
  }

  return runAuthed({ caseId: params.id }, async () => {
    try {
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
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as any))
  const text = String(body?.text ?? '').trim()
  if (!text) return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 })

  // Mock mode: append to mock store without auth.
  if (isDevNoDB) {
    const item = addMessageMock(params.id, 'client', text)
    return NextResponse.json({ ok: true, item })
  }

  return runAuthed({ caseId: params.id }, async (sessionUser) => {
    try {
      const prisma = await getPrisma()

      // Make sure case exists + get applicant email to infer role.
      const kase = await prisma.case.findUnique({
        where: { id: params.id },
        select: { id: true, applicantEmail: true },
      })
      if (!kase) return NextResponse.json({ ok: false, reason: 'case-not-found' }, { status: 404 })

      const userEmail = sessionUser.email ?? ''
      // Ensure user exists (carry session's email forward).
      const user = userEmail
        ? await prisma.user.upsert({
            where: { email: userEmail },
            update: {},
            create: { email: userEmail, role: 'CLIENT' },
            select: { id: true, role: true, email: true },
          })
        : { id: sessionUser.id, role: sessionUser.role, email: '' }

      // Infer sender: staff if role is STAFF OR email != applicantEmail; else client.
      const isStaffSender = user.role === 'STAFF' || (
        kase.applicantEmail && user.email && kase.applicantEmail.toLowerCase() !== user.email.toLowerCase()
      )
      const sender: 'client'|'staff' = isStaffSender ? 'staff' : 'client'

      const created = await prisma.message.create({
        data: {
          caseId: params.id,
          sender,
          body: text,
        },
        select: { id: true, sender: true, body: true, createdAt: true },
      })

      // Touch case.updatedAt and write audit (best-effort).
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
  })
}
