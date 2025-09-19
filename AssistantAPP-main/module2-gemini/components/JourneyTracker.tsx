'use client'
import React from 'react'
import { useJourney } from '@/module2-gemini/hooks/useJourney'
import ProgressBar from '@/module2-gemini/components/ProgressBar'
import StatusTimeline from '@/module2-gemini/components/StatusTimeline'

interface JourneyTrackerProps { caseId: string }

export default function JourneyTracker({ caseId }: JourneyTrackerProps) {
  const { data, loading, error, reload } = useJourney(caseId)

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
      <button onClick={reload} className="px-3 py-1.5 rounded-lg border">Refresh</button>
    </div>
  )
}
