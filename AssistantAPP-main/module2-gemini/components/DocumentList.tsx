'use client'
import React, { useEffect, useState } from 'react'
import type { CaseDocument } from '@/module2-gemini/types'
import { listDocuments } from '@/module2-gemini/lib/db-operations'
import DocumentViewer from '@/module2-gemini/components/DocumentViewer'
import { toast } from '@/module2-gemini/lib/toast'

interface DocumentListProps {
  caseId: string
}

export default function DocumentList({ caseId }: DocumentListProps) {
  const [docs, setDocs] = useState<CaseDocument[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { documents } = await listDocuments(caseId)
      setDocs(documents)
    } catch (e:any) {
      toast.error('Failed to load documents')
      console.error('Operation failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [caseId])

  if (loading) return <div className="p-4">Loading…</div>

  return (
    <div className="space-y-3">
      {docs.map(d => (
        <div key={d.id} className="p-4 border rounded-2xl flex items-center justify-between">
          <div>
            <div className="font-medium">{d.file_name}</div>
            <div className="text-xs text-gray-500">v{d.version} • {d.status}</div>
          </div>
          <DocumentViewer documentId={d.id} driveFileId={d.drive_file_id} />
        </div>
      ))}
      {!docs.length && <div className="text-sm text-gray-500 p-4 border rounded-2xl">No documents yet.</div>}
    </div>
  )
}
