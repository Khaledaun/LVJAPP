'use client'
import React, { useState } from 'react'

export default function NotificationSystem() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('Test Notification')
  const [html, setHtml] = useState('<p>Hello from LVJ</p>')
  const [result, setResult] = useState<string>('')

  const send = async () => {
    const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'notify', to: to.split(',').map(s=>s.trim()).filter(Boolean), subject, html }) })
    const data = await res.json()
    setResult(res.ok ? `Sent via ${data.provider}` : (data.error || 'Failed'))
  }

  return (
    <div className="border rounded-2xl p-4 space-y-3">
      <div className="font-semibold">Notification System</div>
      <input value={to} onChange={e=>setTo(e.target.value)} placeholder="Emails (comma-separated)" className="w-full border rounded-xl px-3 py-2" />
      <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="w-full border rounded-xl px-3 py-2" />
      <textarea value={html} onChange={e=>setHtml(e.target.value)} rows={5} className="w-full border rounded-xl px-3 py-2 font-mono" />
      <button onClick={send} className="px-4 py-2 rounded-xl bg-green-600 text-white">Send</button>
      {result && <div className="text-sm text-gray-600">{result}</div>}
    </div>
  )
}
