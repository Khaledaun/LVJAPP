'use client'
import React, { useState } from 'react'
import type { DocumentData } from '@/module2-gemini/types'
import { toast } from '@/module2-gemini/lib/toast'

interface DocumentUploaderProps {
  caseId: string
  documentTypeId: string
  uploadedBy: string
  onUploaded?: (documentId: string) => void
  maxFileSize?: number
}

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve((r.result as string).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function DocumentUploader({ caseId, documentTypeId, uploadedBy, onUploaded, maxFileSize = 25 * 1024 * 1024 }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const onSelect = (f: File | null) => {
    if (!f) return setFile(null)
    if (f.size > maxFileSize) {
      toast.error('File too large')
      return
    }
    setFile(f)
  }

  const upload = async () => {
    if (!file) return
    setBusy(true)
    try {
      const base64Content = await fileToBase64(file)
      const payload: DocumentData = {
        caseId,
        documentTypeId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Content,
        uploadedBy,
      }
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', ...payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      toast.success('Uploaded')
      onUploaded?.(json.documentId)
      setFile(null)
    } catch (error:any) {
      toast.error('Upload failed')
      console.error('Operation failed:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 border rounded-2xl space-y-3">
      <div className="font-semibold">Upload document</div>
      <input type="file" onChange={e => onSelect(e.target.files?.[0] || null)} className="block w-full text-sm" />
      <button onClick={upload} disabled={!file || busy} className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">
        {busy ? 'Uploading…' : 'Upload'}
      </button>
      {file && <div className="text-xs text-gray-500">{file.name} • {Math.round(file.size/1024)} KB</div>}
    </div>
  )
}
