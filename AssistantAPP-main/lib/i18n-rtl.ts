// Sprint 0.7 · D-015 — RTL helpers paired with lib/i18n.ts.
//
// Claude.md v4.0 §Phase 2 typography rules:
//   - --font-display ≥ 18px is ONLY serif (Cormorant for LTR, Amiri for RTL).
//   - --font-body is sans (Inter for LTR, IBM Plex Sans Arabic for RTL).
//   - --font-mono stays JetBrains Mono — case IDs / dates remain Latin per
//     SEF/AIMA convention even under RTL.
//
// CSS layer in globals.css uses `[dir="rtl"]` to swap the variables. This
// helper exists for places that compute classNames or `dir` attributes in
// JS/TS (server components, middleware, AppShell prop wiring).

import type { Locale } from './i18n'

const RTL_LOCALES = new Set<Locale>(['ar'])

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.has(locale)
}

export function getDir(locale: Locale): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr'
}

export function getHtmlLangAttr(locale: Locale): string {
  // Browser-friendly BCP 47 tags. PT defaults to pt-PT (LVJ's primary
  // jurisdiction per D-006), not pt-BR. Adjust if a Brazilian Portuguese
  // bundle ever ships.
  switch (locale) {
    case 'ar': return 'ar'
    case 'pt': return 'pt-PT'
    case 'en':
    default: return 'en'
  }
}

/**
 * Returns the CSS variable (with var() wrapper) for the body font in the
 * given locale. Use as `style={{ fontFamily: getBodyFontVar('ar') }}` when
 * a component needs to override at runtime; otherwise rely on the [dir=rtl]
 * swap in globals.css.
 */
export function getBodyFontVar(locale: Locale): string {
  return isRtlLocale(locale) ? 'var(--font-lvj-arabic-body)' : 'var(--font-lvj-sans)'
}

export function getDisplayFontVar(locale: Locale): string {
  return isRtlLocale(locale) ? 'var(--font-lvj-arabic-display)' : 'var(--font-lvj-serif)'
}

/**
 * Numbers stay locale-formatted EXCEPT case IDs / dates / file sizes / progress
 * percentages, which remain Latin per SEF/AIMA convention (Claude.md v4.0).
 * Use this helper for *prose* numerals; pass `kind: 'identifier'` for IDs/dates.
 */
export function formatNumber(
  value: number,
  locale: Locale,
  kind: 'prose' | 'identifier' = 'prose',
): string {
  if (kind === 'identifier') return value.toString()
  try {
    return new Intl.NumberFormat(getHtmlLangAttr(locale)).format(value)
  } catch {
    return value.toString()
  }
}
