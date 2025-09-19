'use client'
import React from 'react'
import ChatInterface from '@/module3-gpt5/components/ChatInterface'
import NotificationSystem from '@/module3-gpt5/components/NotificationSystem'

interface MessageCenterProps {
  caseId: string
  currentUserId: string
}

export default function MessageCenter({ caseId, currentUserId }: MessageCenterProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChatInterface caseId={caseId} currentUserId={currentUserId} />
      <NotificationSystem />
    </div>
  )
}
