import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { isDevNoDB } from '@/lib/dev'
import { runAuthed } from '@/lib/rbac-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()

  return runAuthed({ caseId: params.id }, async () => {
    if (isDevNoDB) {
      return NextResponse.json({ ok: true })
    }

    const prisma = await getPrisma()

    const allowedVisa = ['work','spouse','student','tourist','extension','asylum','other']
    const data: any = {}

    if ('visaType' in body) {
      if (body.visaType === null || allowedVisa.includes(body.visaType)) {
        data.visaType = body.visaType
      }
    }
    if ('originCountry' in body) {
      data.originCountry = body.originCountry || null
    }
    if ('assigneeId' in body) {
      data.assigneeId = body.assigneeId || null
    }

    const kase = await prisma.case.update({ where: { id: params.id }, data })
    return NextResponse.json({ case: kase })
  })
}
