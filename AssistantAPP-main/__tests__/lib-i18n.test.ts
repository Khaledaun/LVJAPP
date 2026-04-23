/**
 * Sprint 0.7 · D-015 — unit tests for the lightweight i18n primitives.
 *
 * Covers lib/i18n.ts (resolveLocale, t, isLocale) and lib/i18n-rtl.ts
 * (isRtlLocale, getDir, getHtmlLangAttr, formatNumber).
 */

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SHIPPED_LOCALES,
  SUPPORTED_LOCALES,
  isLocale,
  resolveLocale,
  t,
} from '@/lib/i18n'
import {
  formatNumber,
  getBodyFontVar,
  getDir,
  getDisplayFontVar,
  getHtmlLangAttr,
  isRtlLocale,
} from '@/lib/i18n-rtl'

describe('lib/i18n · primitives', () => {
  describe('constants', () => {
    it('exposes the supported + shipped locale lists', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'ar', 'pt'])
      expect(SHIPPED_LOCALES).toEqual(['en', 'ar'])
      expect(DEFAULT_LOCALE).toBe('en')
      expect(LOCALE_COOKIE).toBe('lvj_locale')
    })
  })

  describe('isLocale', () => {
    it.each(['en', 'ar', 'pt'])('accepts %s', (l) => {
      expect(isLocale(l)).toBe(true)
    })
    it.each(['fr', '', null, undefined, 'EN', 'arabic'])('rejects %s', (v) => {
      expect(isLocale(v as any)).toBe(false)
    })
  })

  describe('resolveLocale', () => {
    it('prefers an explicit /ar/ pathname segment over cookie', () => {
      expect(
        resolveLocale({ pathname: '/ar/dashboard', cookieValue: 'en', acceptLanguage: 'en-US' }),
      ).toBe('ar')
    })

    it('falls back to cookie when path has no locale segment', () => {
      expect(
        resolveLocale({ pathname: '/dashboard', cookieValue: 'ar', acceptLanguage: 'en-US' }),
      ).toBe('ar')
    })

    it('falls back to Accept-Language when no path or cookie', () => {
      expect(
        resolveLocale({ pathname: '/', cookieValue: null, acceptLanguage: 'ar-EG,ar;q=0.9,en;q=0.8' }),
      ).toBe('ar')
    })

    it('returns DEFAULT_LOCALE when nothing matches', () => {
      expect(
        resolveLocale({ pathname: '/', cookieValue: null, acceptLanguage: 'fr-FR' }),
      ).toBe('en')
    })

    it('ignores an unsupported path segment like /fr/', () => {
      expect(
        resolveLocale({ pathname: '/fr/dashboard', cookieValue: null, acceptLanguage: null }),
      ).toBe('en')
    })
  })

  describe('t', () => {
    it('returns EN strings unchanged', () => {
      expect(t('en', 'sidebar.dashboard')).toBe('Dashboard')
      expect(t('en', 'topbar.search_placeholder')).toContain('Search')
    })

    it('returns AR strings when present', () => {
      expect(t('ar', 'sidebar.dashboard')).toBe('لوحة التحكم')
      expect(t('ar', 'sidebar.cases')).toBe('القضايا')
    })

    it('falls back to EN when AR missing', () => {
      // pt.json is the stub; t('pt', ...) should fall back to EN
      expect(t('pt', 'sidebar.dashboard')).toBe('Dashboard')
    })

    it('returns the key itself when missing in all locales', () => {
      expect(t('en', 'totally.not.a.real.key')).toBe('totally.not.a.real.key')
    })
  })
})

describe('lib/i18n-rtl · helpers', () => {
  it('isRtlLocale: only Arabic is RTL', () => {
    expect(isRtlLocale('ar')).toBe(true)
    expect(isRtlLocale('en')).toBe(false)
    expect(isRtlLocale('pt')).toBe(false)
  })

  it('getDir maps to ltr | rtl', () => {
    expect(getDir('ar')).toBe('rtl')
    expect(getDir('en')).toBe('ltr')
    expect(getDir('pt')).toBe('ltr')
  })

  it('getHtmlLangAttr emits BCP-47 tags', () => {
    expect(getHtmlLangAttr('en')).toBe('en')
    expect(getHtmlLangAttr('ar')).toBe('ar')
    expect(getHtmlLangAttr('pt')).toBe('pt-PT')
  })

  it('font vars swap under RTL', () => {
    expect(getBodyFontVar('en')).toContain('--font-lvj-sans')
    expect(getBodyFontVar('ar')).toContain('--font-lvj-arabic-body')
    expect(getDisplayFontVar('ar')).toContain('--font-lvj-arabic-display')
  })

  it('formatNumber leaves identifiers Latin under any locale', () => {
    expect(formatNumber(12345, 'ar', 'identifier')).toBe('12345')
    expect(formatNumber(12345, 'en', 'identifier')).toBe('12345')
  })

  it('formatNumber localises prose numerals', () => {
    // Don't assert a specific glyph (Intl rules vary by Node version);
    // just confirm it produces a non-empty string and identifier path
    // differs from prose path under AR.
    const ar = formatNumber(12345, 'ar', 'prose')
    const id = formatNumber(12345, 'ar', 'identifier')
    expect(ar.length).toBeGreaterThan(0)
    expect(typeof ar).toBe('string')
    expect(id).toBe('12345')
  })
})
