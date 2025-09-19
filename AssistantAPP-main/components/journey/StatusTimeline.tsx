'use client'
import React from 'react'
import { TrafficLightBadge, useTrafficLightFeature, type TrafficLightStatus } from '@/components/ui/TrafficLightBadge'

type Item = { id: string; title: string; status: 'not_started'|'in_progress'|'blocked'|'completed'; due_date?: string }

// Legacy badge function for backward compatibility
const legacyBadge = (s: Item['status']) => {
  const map: Record<Item['status'], string> = {
    not_started: 'bg-gray-200 text-gray-700',
    in_progress: 'bg-blue-200 text-blue-800',
    blocked: 'bg-red-200 text-red-800',
    completed: 'bg-green-200 text-green-800',
  }
  return map[s]
}

export default function StatusTimeline({ stages }: { stages: Item[] }) {
  const isTrafficLightEnabled = useTrafficLightFeature()

  return (
    <ul className="space-y-2">
      {stages.map(s => (
        <li key={s.id} className="p-3 border rounded-xl flex items-center justify-between">
          <div>
            <div className="font-medium">{s.title}</div>
            {s.due_date && <div className="text-xs text-gray-500">Due: {s.due_date}</div>}
          </div>
          {isTrafficLightEnabled ? (
            <TrafficLightBadge 
              status={s.status as TrafficLightStatus} 
              size="sm"
              showIcon={true}
              showText={true}
            />
          ) : (
            <span className={`px-2 py-0.5 rounded ${legacyBadge(s.status)}`}>
              {s.status}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
