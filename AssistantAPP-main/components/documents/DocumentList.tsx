'use client'
import React, { useEffect, useState } from 'react'
import DocumentViewer from './DocumentViewer'

type Doc = {
  id: string
  file_name: string
  status: 'pending_review'|'approved'|'rejected'|'missing'
  drive_file_id?: string
  version: number
}

export default function DocumentList({ caseId }: { caseId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/documents?caseId=${caseId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setDocs(data.documents || [])
    } catch (e:any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [caseId])

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="space-y-3">
      {docs.map(d => (
        <div key={d.id} className="p-4 border rounded-2xl flex items-center justify-between">
          <div>
            <div className="font-medium">{d.file_name}</div>
            <div className="text-xs text-gray-500">v{d.version} • {d.status}</div>
          </div>
          <div className="flex gap-2">
            <DocumentViewer documentId={d.id} driveFileId={d.drive_file_id} />
          </div>
        </div>
      ))}
    </div>
  )
}
