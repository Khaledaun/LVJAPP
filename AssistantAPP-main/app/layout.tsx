import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, Cormorant_Garamond, JetBrains_Mono, Amiri } from 'next/font/google'
import Providers from './providers'
import { ErrorBoundary } from '@/components/Boundary'
import './globals.css'

// LVJ typography stack — bound to the CSS custom properties in globals.css.
// Sans (body), Serif (display ≥15px only), Mono (IDs / dates / numeric),
// Arabic (RTL + bilingual headings).
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-lvj-sans',
  display: 'swap',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-lvj-serif',
  display: 'swap',
})
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-lvj-mono',
  display: 'swap',
})
const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lvj-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LVJ Case Assistant',
  description: 'Immigration case management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable} ${amiri.variable}`}
    >
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
