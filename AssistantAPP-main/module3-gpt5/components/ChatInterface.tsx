'use client'
import React, { useState } from 'react'
import { useMessages } from '@/module3-gpt5/hooks/useMessages'

interface ChatInterfaceProps {
  caseId: string
  currentUserId: string
}

export default function ChatInterface({ caseId, currentUserId }: ChatInterfaceProps) {
  const { items, loading, post } = useMessages(caseId, currentUserId)
  const [text, setText] = useState('')

  const send = async () => {
    if (!text.trim()) return
    await post(text.trim())
    setText('')
  }

  return (
    <div className="border rounded-2xl p-4 space-y-3">
      <div className="font-semibold">Case Messages</div>
      <div className="h-64 overflow-y-auto space-y-2 border rounded-xl p-3 bg-white">
        {loading ? 'Loading…' : items.map(m => (
          <div key={m.id} className="p-2 rounded-lg border">
            <div className="text-xs text-gray-500">{m.sender_id}</div>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 border rounded-xl px-3 py-2" />
        <button onClick={send} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Send</button>
      </div>
    </div>
  )
}
