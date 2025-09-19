'use client'
import React from 'react'

export default function DocumentViewer({ documentId, driveFileId }: { documentId: string; driveFileId?: string }) {
  const open = () => {
    // In production, replace with actual Drive URL or proxy
    const url = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : `#doc-${documentId}`
    window.open(url, '_blank')
  }
  return (
    <button onClick={open} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Open</button>
  )
}
