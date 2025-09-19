'use client'
import React from 'react'
import type { JourneyStatus } from '@/module2-gemini/types'

interface Item { id: string; title: string; status: JourneyStatus; due_date?: string }

const badge = (s: JourneyStatus) => {
  const map: Record<JourneyStatus, string> = {
    not_started: 'bg-gray-200 text-gray-700',
    in_progress: 'bg-blue-200 text-blue-800',
    blocked: 'bg-red-200 text-red-800',
    completed: 'bg-green-200 text-green-800',
  }
  return map[s]
}

export default function StatusTimeline({ stages }: { stages: Item[] }) {
  return (
    <ul className="space-y-2">
      {stages.map(s => (
        <li key={s.id} className="p-3 border rounded-xl flex items-center justify-between">
          <div>
            <div className="font-medium">{s.title}</div>
            {s.due_date && <div className="text-xs text-gray-500">Due: {s.due_date}</div>}
          </div>
          <span className={`px-2 py-0.5 rounded ${badge(s.status)}`}>{s.status}</span>
        </li>
      ))}
    </ul>
  )
}
