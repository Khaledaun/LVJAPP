'use client'
import React from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  console.error('Global error:', error)
  return (
    <html>
      <body>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-red-700">An error occurred</h2>
          <p className="text-sm text-gray-700 mt-2">{error.message}</p>
          <button onClick={() => reset()} className="mt-3 px-3 py-1.5 rounded border">Try again</button>
        </div>
      </body>
    </html>
  )
}
