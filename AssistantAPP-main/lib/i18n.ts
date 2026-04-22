// Sprint 0.7 · D-015 · D-019 — minimal i18n primitives.
//
// This is intentionally lightweight (no next-intl install in the
// sandbox today). Once node_modules is provisioned we plan to migrate
// to next-intl; the message JSON layout under messages/<locale>.json is
// next-intl-compatible so that migration is mechanical.
//
// Server-safe: no React imports here. The thin React hook lives in
// lib/i18n-client.tsx (TBD when the first component migrates to t()).

import enMessages from '@/messages/en.json'
import arMessages from '@/messages/ar.json'
import ptMessages from '@/messages/pt.json'

export type Locale = 'en' | 'ar' | 'pt'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ar', 'pt'] as const
export const DEFAULT_LOCALE: Locale = 'en'

// Locales that ship to clients in v1. Per D-015, EN + AR are first-class;
// PT is planned for v1.x. Components/SSR may reference SHIPPED_LOCALES to
// gate UI like the locale switcher (do not list PT until population is
// reviewed).
export const SHIPPED_LOCALES: readonly Locale[] = ['en', 'ar'] as const

export const LOCALE_COOKIE = 'lvj_locale'

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  en: enMessages as Record<string, unknown>,
  ar: arMessages as Record<string, unknown>,
  pt: ptMessages as Record<string, unknown>,
}

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Resolve a locale from (in order of precedence):
 *   1. an explicit URL pathname segment `/ar/...`, `/en/...`, `/pt/...`
 *   2. the `lvj_locale` cookie
 *   3. a comma-separated `accept-language` header (first supported wins)
 *   4. DEFAULT_LOCALE
 */
export function resolveLocale(opts: {
  pathname?: string | null
  cookieValue?: string | null
  acceptLanguage?: string | null
}): Locale {
  const seg = opts.pathname?.split('/').filter(Boolean)[0]
  if (isLocale(seg)) return seg

  if (isLocale(opts.cookieValue)) return opts.cookieValue

  const accept = opts.acceptLanguage ?? ''
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase().slice(0, 2)
    if (isLocale(tag)) return tag
  }

  return DEFAULT_LOCALE
}

/**
 * Look up a translation by dotted key path, e.g. `t('en', 'sidebar.cases')`.
 * Falls back to the EN value if the key is missing (for AR draft keys not yet
 * populated). Returns the key itself if EN is also missing (developer signal).
 *
 * No interpolation today; format strings land with the next-intl migration.
 */
export function t(locale: Locale, key: string): string {
  const value = lookup(MESSAGES[locale], key)
  if (typeof value === 'string') return value
  if (locale !== DEFAULT_LOCALE) {
    const fallback = lookup(MESSAGES[DEFAULT_LOCALE], key)
    if (typeof fallback === 'string') return fallback
  }
  return key
}

function lookup(tree: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.')
  let cur: unknown = tree
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return cur
}

/** Returns the loaded message tree for a locale; useful for client serialisation. */
export function getMessages(locale: Locale): Record<string, unknown> {
  return MESSAGES[locale]
}
