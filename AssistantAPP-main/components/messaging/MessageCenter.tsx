'use client'
import React from 'react'
import ChatInterface from './ChatInterface'
import NotificationSystem from './NotificationSystem'

export default function MessageCenter({ caseId, currentUserId }: { caseId: string; currentUserId: string }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChatInterface caseId={caseId} currentUserId={currentUserId} />
      <NotificationSystem />
    </div>
  )
}
