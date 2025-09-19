import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Avoid SSR calling useSession by dynamically loading client shell
const DashboardShell = dynamic(() => import('@/components/dashboard/DashboardShell'), { ssr: false })

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading dashboard…</div>}>
      <DashboardShell />
    </Suspense>
  )
}
