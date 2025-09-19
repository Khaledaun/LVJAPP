'use client'
import React, { useState } from 'react'

type Props = { caseId: string; documentTypeId: string; onUploaded?: (docId: string) => void }

export default function DocumentUpload({ caseId, documentTypeId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toBase64(f: File): Promise<string> {
    return await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res((r.result as string).split(',')[1])
      r.onerror = rej
      r.readAsDataURL(f)
    })
  }

  const upload = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const base64 = await toBase64(file)
      const payload = {
        action: 'upload',
        caseId,
        documentTypeId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Content: base64,
        uploadedBy: 'currentUser', // replace with auth context uid
      }
      const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onUploaded?.(data.documentId)
    } catch (e:any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-2xl space-y-3">
      <div className="font-semibold">Upload document</div>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
      <button
        onClick={upload}
        disabled={!file || loading}
        className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? 'Uploading…' : 'Upload'}
      </button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  )
}
