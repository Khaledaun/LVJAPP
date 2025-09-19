import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since') || '30'
  const days = Math.max(1, parseInt(since, 10) || 30)
  // Implementer: compute KPIs from your DB
  const kpis = { period_days: days, payments_created: 0, messages_created: 0 }
  return Response.json({ kpis })
}
