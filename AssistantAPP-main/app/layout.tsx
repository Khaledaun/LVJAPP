import type { Metadata } from 'next'
import { Suspense } from 'react'
import Providers from './providers'
import { AppLayout } from '@/components/layout/app-layout'
import { ErrorBoundary } from '@/components/Boundary'
import './globals.css'

export const metadata: Metadata = {
  title: 'LVJ Case Assistant',
  description: 'Immigration case management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-montserrat">
        <ErrorBoundary fallback={<div className="p-4 text-red-600">App failed to render.</div>}>
          <Providers>
            <AppLayout>
              <Suspense fallback={<div className="p-4">Loading…</div>}>
                {children}
              </Suspense>
            </AppLayout>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}