import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/db'
import { guardCaseAccess } from '@/lib/rbac-http'
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 })
  const g = await guardCaseAccess(caseId)
  if (!g.ok) return g.response
  const prisma = await getPrisma();
  // Implementer: fetch journey from your DB and compute completion.
  return Response.json({ stages: [], completionPercentage: 0 })
}
