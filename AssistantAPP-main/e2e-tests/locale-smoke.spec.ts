/**
 * S-010 · Locale + RTL smoke (Sprint 0.7 · D-015)
 *
 * Asserts:
 *   - Default request renders <html lang="en" dir="ltr">.
 *   - Setting the lvj_locale=ar cookie flips <html> to lang="ar" dir="rtl".
 *   - The middleware sets the cookie when an explicit /ar/* path is hit.
 *   - The Arabic body & display font CSS variables are present on the
 *     rendered document (loaded via next/font/google).
 *   - Console shows no error during EN or AR render.
 *
 * Per docs/EXECUTION_PLAN.md §3.4, this smoke is sandbox-without-DB safe
 * — it never touches Prisma; only HTML head / cookies / layout markers.
 */

import { test, expect } from '@playwright/test'

test.describe('S-010 · locale + RTL smoke', () => {
  test('default render is EN / LTR', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'en')
    await expect(html).toHaveAttribute('dir', 'ltr')
    await expect(html).toHaveAttribute('data-locale', 'en')

    expect.soft(errors, `EN render produced console errors: ${errors.join('\n')}`).toEqual([])
  })

  test('cookie lvj_locale=ar flips to AR / RTL', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'lvj_locale',
        value: 'ar',
        url: 'http://localhost:3000',
      },
    ])
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'ar')
    await expect(html).toHaveAttribute('dir', 'rtl')
    await expect(html).toHaveAttribute('data-locale', 'ar')

    expect.soft(errors, `AR render produced console errors: ${errors.join('\n')}`).toEqual([])
  })

  test('middleware sets lvj_locale cookie from /ar/* path', async ({ page, context }) => {
    // No initial cookie; visit an /ar/-prefixed (matched by middleware) URL.
    await page.goto('/ar/dashboard', { waitUntil: 'commit' }).catch(() => null)
    // The route may 404 (no /ar/ route group yet) but the middleware should
    // still run and set the cookie.
    const cookies = await context.cookies()
    const localeCookie = cookies.find((c) => c.name === 'lvj_locale')
    expect(localeCookie?.value).toBe('ar')
  })

  test('AR-bound CSS variables are reachable from the document', async ({ page, context }) => {
    await context.addCookies([{ name: 'lvj_locale', value: 'ar', url: 'http://localhost:3000' }])
    await page.goto('/')
    // next/font/google injects the variable on <html className=...>; we
    // confirm the resolved style value isn't empty.
    const arabicBody = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--font-lvj-arabic-body').trim()
    })
    const arabicDisplay = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--font-lvj-arabic-display').trim()
    })
    expect(arabicBody.length, '--font-lvj-arabic-body should be populated by next/font').toBeGreaterThan(0)
    expect(arabicDisplay.length, '--font-lvj-arabic-display should be populated by next/font').toBeGreaterThan(0)
  })
})
