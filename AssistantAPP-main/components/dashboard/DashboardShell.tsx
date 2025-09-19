'use client'
import React from 'react'
import { useSession } from 'next-auth/react'

export default function DashboardShell() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="p-4">Checking session…</div>
  }

  if (!session) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-lg font-semibold">Welcome</div>
        <p className="text-sm text-gray-600">You are not signed in. You can still browse public content.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      <div className="text-lg font-semibold">Dashboard</div>
      <div className="text-sm text-gray-600">Signed in as {session.user?.email} (role: {session.user?.role})</div>
      {/* Place authenticated widgets/components here */}
    </div>
  )
}
