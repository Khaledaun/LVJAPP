import { NextRequest } from 'next/server'
import type { DocumentData } from '@/module2-gemini/types'

// NOTE: This handler is integration-ready. Replace the internals with your DB layer.
// For convenience, it keeps the same request contract used by the module lib.

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 })
  // Delegate to your existing backend (e.g., Firestore/Prisma). Placeholder: call internal service.
  // Implementer: replace with your data calls.
  return Response.json({ documents: [], categories: {} })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  if (action === 'upload') {
    const { caseId, documentTypeId, fileName, mimeType, base64Content, uploadedBy } = body as DocumentData & { caseId: string }
    if (!caseId || !documentTypeId || !fileName || !mimeType || !base64Content || !uploadedBy)
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    // Implementer: store file and create record. Return IDs.
    return Response.json({ documentId: 'doc_placeholder', driveFileId: undefined })
  }
  if (action === 'review') {
    const { caseId, documentId, status, reviewerId, rejectionReason } = body
    if (!caseId || !documentId || !status || !reviewerId) return Response.json({ error: 'Missing fields' }, { status: 400 })
    // Implementer: update record
    return Response.json({ updated: true })
  }
  return Response.json({ error: 'Unsupported action' }, { status: 400 })
}
