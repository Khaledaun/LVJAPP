import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import {
  Inter,
  Cormorant_Garamond,
  JetBrains_Mono,
  Amiri,
  IBM_Plex_Sans_Arabic,
} from 'next/font/google'
import Providers from './providers'
import { ErrorBoundary } from '@/components/Boundary'
import { LOCALE_COOKIE, isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { getDir, getHtmlLangAttr } from '@/lib/i18n-rtl'
import './globals.css'

// LVJ typography stack — bound to the CSS custom properties in globals.css.
// Sans (body), Serif (display ≥15px only), Mono (IDs / dates / numeric),
// Arabic display (Amiri ≥ 18px), Arabic body (IBM Plex Sans Arabic) — D-015.
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
  variable: '--font-lvj-arabic-display',
  display: 'swap',
})
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-lvj-arabic-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LVJ Case Assistant',
  description: 'Immigration case management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value
  const locale: Locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE

  return (
    <html
      lang={getHtmlLangAttr(locale)}
      dir={getDir(locale)}
      data-locale={locale}
      className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable} ${amiri.variable} ${ibmPlexSansArabic.variable}`}
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
