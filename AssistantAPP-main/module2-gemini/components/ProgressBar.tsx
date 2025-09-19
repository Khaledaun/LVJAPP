'use client'
import React from 'react'

interface ProgressBarProps { percent: number }

export default function ProgressBar({ percent }: ProgressBarProps) {
  const p = Math.min(100, Math.max(0, percent))
  return (
    <div className="w-full bg-gray-100 rounded-xl h-3">
      <div className="h-3 rounded-xl bg-green-600" style={{ width: `${p}%` }} />
    </div>
  )
}
