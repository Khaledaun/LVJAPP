'use client'
import React, { useEffect, useState } from 'react'

type Msg = {
  id: string
  sender_id: string
  text: string
  status: 'unread'|'read'|'answered'
  created_at?: any
}

export default function ChatInterface({ caseId, currentUserId }: { caseId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/messages?caseId=${caseId}`)
    const data = await res.json()
    setMessages(data.messages || [])
    setLoading(false)
  }

  const send = async () => {
    if (!text.trim()) return
    const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'post', caseId, senderId: currentUserId, text }) })
    if (res.ok) {
      setText('')
      await load()
    }
  }

  useEffect(() => { load() }, [caseId])

  return (
    <div className="border rounded-2xl p-4 space-y-3">
      <div className="font-semibold">Case Messages</div>
      <div className="h-64 overflow-y-auto space-y-2 border rounded-xl p-3 bg-white">
        {loading ? 'Loading…' : messages.map(m => (
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
