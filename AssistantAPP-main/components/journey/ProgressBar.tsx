'use client'
import React from 'react'

export default function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-xl h-3">
      <div className="h-3 rounded-xl bg-green-600" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  )
}
