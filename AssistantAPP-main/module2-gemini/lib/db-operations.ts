// Database abstraction layer for Module 2 (no direct DB client imports in components)
// Replace the internals with your app's DB/SDK (Firestore, Prisma, etc.) as needed.

import type { DocumentData, CaseDocument, JourneySummary } from '@/module2-gemini/types'
import { formatDateISO } from '@/module2-gemini/lib/utils'

// --- Documents ---
export async function createDocument(data: DocumentData): Promise<{ documentId: string; driveFileId?: string }> {
  // Call the module API to keep the DB details abstracted.
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'upload', ...data, caseId: data.caseId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create document')
  return json
}

export async function listDocuments(caseId: string): Promise<{ documents: CaseDocument[]; categories: Record<string, CaseDocument[]> }> {
  const res = await fetch(`/api/documents?caseId=${encodeURIComponent(caseId)}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to load documents')
  return json
}

export async function reviewDocument(params: { caseId: string; documentId: string; status: 'approved'|'rejected'; reviewerId: string; rejectionReason?: string }): Promise<{ updated: true }> {
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'review', ...params }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to review document')
  return json
}

// --- Journey ---
export async function getJourney(caseId: string): Promise<JourneySummary> {
  const res = await fetch(`/api/journey?caseId=${encodeURIComponent(caseId)}`, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to load journey')
  return json
}
