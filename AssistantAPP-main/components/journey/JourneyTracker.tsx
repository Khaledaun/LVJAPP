'use client'
import React, { useEffect, useState } from 'react'
import ProgressBar from './ProgressBar'
import StatusTimeline from './StatusTimeline'

type Stage = { id: string; title: string; status: 'not_started'|'in_progress'|'blocked'|'completed'; due_date?: string }
type Summary = { stages: Stage[]; completionPercentage: number }

export default function JourneyTracker({ caseId }: { caseId: string }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/journey?caseId=${caseId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load journey')
      setData(json)
    } catch (e:any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [caseId])

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!data) return null

  return (
    <div className="space-y-4 p-4 border rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Journey Progress</div>
        <div className="text-sm text-gray-600">{data.completionPercentage}%</div>
      </div>
      <ProgressBar percent={data.completionPercentage} />
      <StatusTimeline stages={data.stages} />
    </div>
  )
}
