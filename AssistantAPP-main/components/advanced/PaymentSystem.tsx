'use client'
import React, { useEffect, useState } from 'react'

type Payment = {
  id: string
  title: string
  amount: number
  currency: string
  status: 'pending'|'awaiting_review'|'paid'|'overdue'|'waived'|'rejected'
  pay_link?: string
}

export default function PaymentSystem({ caseId, currentUserId }: { caseId: string; currentUserId?: string }) {
  const [items, setItems] = useState<Payment[]>([])
  const [title, setTitle] = useState('Service Fee')
  const [amount, setAmount] = useState(100)
  const [currency, setCurrency] = useState('EUR')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/payments?caseId=${caseId}`)
    const data = await res.json()
    setItems(data.payments || [])
  }

  const create = async () => {
    setCreating(true)
    const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', caseId, title, amount, currency }) })
    if (res.ok) await load()
    setCreating(false)
  }

  const link = async (paymentId: string) => {
    const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pay-link', paymentId }) })
    if (res.ok) await load()
  }

  useEffect(() => { load() }, [caseId])

  return (
    <div className="border rounded-2xl p-4 space-y-3">
      <div className="font-semibold">Payments</div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-600">Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Amount</label>
          <input type="number" value={amount} onChange={e=>setAmount(parseFloat(e.target.value))} className="w-28 border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Currency</label>
          <input value={currency} onChange={e=>setCurrency(e.target.value)} className="w-28 border rounded-xl px-3 py-2" />
        </div>
        <button onClick={create} disabled={creating} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{creating?'Creating…':'Create'}</button>
      </div>
      <div className="space-y-2">
        {items.map(p => (
          <div key={p.id} className="p-3 border rounded-xl flex items-center justify-between">
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-gray-500">{p.amount} {p.currency} • {p.status}</div>
              {p.pay_link && <a href={p.pay_link} target="_blank" className="text-blue-700 underline text-xs">Open pay link</a>}
            </div>
            <button onClick={()=>link(p.id)} className="px-3 py-1.5 rounded-lg border">Generate Link</button>
          </div>
        ))}
      </div>
    </div>
  )
}
