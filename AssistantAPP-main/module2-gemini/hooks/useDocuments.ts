'use client'
import { useCallback, useEffect, useState } from 'react'
import type { CaseDocument, DocumentData } from '@/module2-gemini/types'
import { createDocument, listDocuments, reviewDocument } from '@/module2-gemini/lib/db-operations'
import { toast } from '@/module2-gemini/lib/toast'

export function useDocuments(caseId: string) {
  const [documents, setDocuments] = useState<CaseDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { documents } = await listDocuments(caseId)
      setDocuments(documents)
    } catch (e:any) {
      setError(e.message || 'Failed to load documents')
      toast.error('Failed to load documents')
      console.error('Operation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { if (caseId) load() }, [caseId, load])

  const upload = useCallback(async (data: Omit<DocumentData, 'caseId'>) => {
    try {
      const res = await createDocument({ caseId, ...data })
      toast.success('Document uploaded')
      await load()
      return res
    } catch (e:any) {
      toast.error('Upload failed')
      console.error('Operation failed:', e)
      throw e
    }
  }, [caseId, load])

  const review = useCallback(async (args: { documentId: string; status: 'approved'|'rejected'; reviewerId: string; rejectionReason?: string }) => {
    try {
      await reviewDocument({ caseId, ...args })
      toast.success('Review submitted')
      await load()
    } catch (e:any) {
      toast.error('Review failed')
      console.error('Operation failed:', e)
      throw e
    }
  }, [caseId, load])

  return { documents, loading, error, reload: load, upload, review }
}
