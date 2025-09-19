import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 })
  // Implementer: fetch journey from your DB and compute completion.
  return Response.json({ stages: [], completionPercentage: 0 })
}
