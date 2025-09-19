import { logAudit } from '@/lib/audit'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { isDevNoDB, listPaymentsMock, markPaymentPaidMock, createPaymentMock } from '@/lib/dev'

// Define payment status constants for development mode
const PayStatus = { unpaid: 'unpaid', paid: 'paid', void: 'void' } as const;
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (isDevNoDB) return NextResponse.json({ items: listPaymentsMock(params.id) })
  const prisma = await getPrisma()
  const items = await prisma.payment.findMany({
    where: { caseId: params.id },
    orderBy: { issuedAt: 'desc' },
  })
  return NextResponse.json({ items })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()

  // Mock mode
  if (isDevNoDB) {
    if (body.action === 'markPaid') {
      const item = markPaymentPaidMock(body.id)
      return NextResponse.json({ ok: true, item })
    }
    if (body.action === 'create') {
      const item = createPaymentMock(params.id, body)
      return NextResponse.json({ ok: true, item })
    }
    return NextResponse.json({ ok: false, reason: 'unknown-action' }, { status: 400 })
  }

  // DB mode
  const prisma = await getPrisma()

  if (body.action === 'markPaid') {
    const p = await prisma.payment.update({
      where: { id: body.id },
      data: { status: PayStatus.paid, paidAt: new Date() },
    })
    await logAudit(prisma, { action: 'payment.markPaid', caseId: params.id, diff: { paymentId: p.id } });
    return NextResponse.json({ ok: true, item: p })
  }

  if (body.action === 'create') {
    const p = await prisma.payment.create({
      data: {
        caseId: params.id,
        description: String(body.description ?? 'Invoice'),
        amountCents: Number(body.amountCents ?? 0),
        currency: String(body.currency ?? 'USD'),
        status: PayStatus.unpaid,
        invoiceNumber: String(body.invoiceNumber ?? `INV-${Date.now()}`),
      },
    })
    await logAudit(prisma, { action: 'payment.create', caseId: params.id, diff: { paymentId: p.id } });
    return NextResponse.json({ ok: true, item: p })
  }

  return NextResponse.json({ ok: false, reason: 'unknown-action' }, { status: 400 })
}
