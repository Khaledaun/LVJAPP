'use client'
import React, { useEffect, useState } from 'react'
import { usePayments } from '@/module3-gpt5/hooks/usePayments'
import { currency } from '@/module3-gpt5/lib/utils'

interface PaymentSystemProps { caseId: string }

export default function PaymentSystem({ caseId }: PaymentSystemProps) {
  const { items, loading, create, link } = usePayments(caseId)
  const [title, setTitle] = useState('Service Fee')
  const [amount, setAmount] = useState(100)
  const [cur, setCur] = useState('EUR')

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
          <input type="number" value={amount} onChange={e=>setAmount(parseFloat(e.target.value||'0'))} className="w-28 border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Currency</label>
          <input value={cur} onChange={e=>setCur(e.target.value)} className="w-28 border rounded-xl px-3 py-2" />
        </div>
        <button onClick={()=>create({ title, amount, currency: cur })} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
      </div>
      <div className="space-y-2">
        {loading ? 'Loading…' : items.map(p => (
          <div key={p.id} className="p-3 border rounded-xl flex items-center justify-between">
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-gray-500">{currency(p.amount, p.currency)} • {p.status}</div>
              {p.pay_link && <a href={p.pay_link} target="_blank" className="text-blue-700 underline text-xs">Open pay link</a>}
            </div>
            <button onClick={()=>link(p.id)} className="px-3 py-1.5 rounded-lg border">Generate Link</button>
          </div>
        ))}
      </div>
    </div>
  )
}
