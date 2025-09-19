'use client'
import React from 'react'

interface DocumentViewerProps {
  documentId: string
  driveFileId?: string
}

export default function DocumentViewer({ documentId, driveFileId }: DocumentViewerProps) {
  const open = () => {
    const url = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : `#doc-${documentId}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return <button onClick={open} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Open</button>
}
