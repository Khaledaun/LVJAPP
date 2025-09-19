import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/db'
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


export async function GET(req: NextRequest) {
  const prisma = await getPrisma();
  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 })
  // Implementer: return payments for caseId
  return Response.json({ payments: [] })
}

export async function POST(req: NextRequest) {
  const prisma = await getPrisma();
  const body = await req.json()
  const { action } = body
  if (action === 'create') {
    const { caseId, title, amount, currency } = body
    if (!caseId || !title || !amount || !currency) return Response.json({ error: 'Missing fields' }, { status: 400 })
    // Implementer: create payment
    return Response.json({ paymentId: 'pay_placeholder' })
  }
  if (action === 'pay-link') {
    const { paymentId } = body
    if (!paymentId) return Response.json({ error: 'paymentId required' }, { status: 400 })
    // Implementer: generate pay link
    return Response.json({ url: '#', provider: 'stripe' })
  }
  return Response.json({ error: 'Unsupported action' }, { status: 400 })
}
