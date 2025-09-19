'use client'
import React, { useEffect, useState } from 'react'

export default function ReportGenerator() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<any>(null)

  const load = async () => {
    const res = await fetch(`/api/reports?since=${days}`)
    const json = await res.json()
    setData(json.kpis)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="border rounded-2xl p-4 space-y-3">
      <div className="font-semibold">Reports</div>
      <div className="flex items-center gap-2">
        <input type="number" value={days} onChange={e=>setDays(parseInt(e.target.value||'30',10))} className="w-28 border rounded-xl px-3 py-2" />
        <button onClick={load} className="px-3 py-2 rounded-xl bg-gray-800 text-white">Refresh</button>
      </div>
      {data && (
        <div className="text-sm text-gray-700">
          <div>Period (days): {data.period_days}</div>
          <div>Payments created: {data.payments_created}</div>
          <div>Messages created: {data.messages_created}</div>
        </div>
      )}
    </div>
  )
}
