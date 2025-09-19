import type { Metadata } from 'next'
import { Suspense } from 'react'
import Providers from '@/app/providers'
import { ErrorBoundary } from '@/components/Boundary'
import './globals.css'

export const metadata: Metadata = {
  title: 'LVJ Case Assistant',
  description: 'Immigration case management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary fallback={<div className="p-4 text-red-600">App failed to render.</div>}>
          <Providers>
            <Suspense fallback={<div className="p-4">Loading…</div>}>
              {children}
            </Suspense>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
