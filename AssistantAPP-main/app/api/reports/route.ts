import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/db'
import { runAuthed } from '@/lib/rbac-http'
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since') || '30'
  const days = Math.max(1, parseInt(since, 10) || 30)
  return runAuthed('staff', async () => {
    await getPrisma();
    // Implementer: compute KPIs from your DB
    const kpis = { period_days: days, payments_created: 0, messages_created: 0 }
    return Response.json({ kpis })
  })
}
