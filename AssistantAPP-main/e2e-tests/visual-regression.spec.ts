/**
 * S-010-VR · Visual regression baseline (Sprint 0.7 · D-015)
 *
 * Closes EXECUTION_PLAN §10.4 exit criterion "Visual regression
 * baseline recorded for EN + AR". Captures full-page screenshots of
 * the two screens that are stable enough to act as a baseline without
 * a live DB:
 *
 *   - `/`        — landing stub. Public, no DB, no cookies required.
 *   - `/signin`  — the two-panel ink/ivory design with the Arabic
 *                  motto on the left brand panel. Also public + no DB,
 *                  and the highest-signal AR screen in the app today
 *                  (the brand panel is the only place where Amiri is
 *                  rendered regardless of locale).
 *
 * For each screen we take one screenshot per locale: `en` and `ar`.
 * Locale flip uses the same `lvj_locale` cookie contract the existing
 * `locale-smoke.spec.ts` exercises — no route changes needed.
 *
 * Baseline storage. Playwright stores baselines next to this file
 * under `visual-regression.spec.ts-snapshots/`. Baselines are **not**
 * hand-authored: they must be generated in the same environment that
 * runs the comparison (platform, browser version, font rendering).
 * The intended flow:
 *
 *   1. This PR ships the spec + scripts + docs.
 *   2. A follow-up PR (or `workflow_dispatch`) runs
 *        `npx playwright test visual-regression --update-snapshots`
 *      in the CI runner, commits the resulting PNGs, and flips this
 *      spec from `test.skip` to blocking.
 *   3. On every subsequent PR, the spec compares head screenshots
 *      against committed baselines; diffs fail the job.
 *
 * The spec is currently marked `test.skip` so it doesn't fail CI
 * before baselines exist. Set `RUN_VISUAL_REGRESSION=1` locally to
 * run it (e.g. when regenerating baselines).
 *
 * Determinism. We disable animations, freeze `Date.now()` against a
 * fixed epoch, and reduce motion via `emulateMedia`. Fonts load via
 * `next/font` which is deterministic across a given browser build;
 * pinning chromium-only (below) avoids webkit/firefox antialiasing
 * drift.
 */

import { test, expect, type Page } from '@playwright/test'

const RUN_VR = process.env.RUN_VISUAL_REGRESSION === '1'
const LOCALES = ['en', 'ar'] as const
const SCREENS: Array<{ path: string; name: string }> = [
  { path: '/', name: 'landing' },
  { path: '/signin', name: 'signin' },
]

// 2026-01-01T00:00:00Z — any fixed epoch works; we only need the
// date-dependent parts of the UI (e.g. copyright years, "last
// updated" stamps) to render identically across runs.
const FROZEN_EPOCH_MS = 1767225600000

async function prepareDeterministicPage(page: Page, locale: 'en' | 'ar') {
  await page.context().addCookies([
    { name: 'lvj_locale', value: locale, url: 'http://localhost:3000' },
  ])
  await page.emulateMedia({ reducedMotion: 'reduce' })

  // Freeze clock before first navigation so any module-top-level
  // `Date.now()` / `new Date()` is deterministic on first render.
  await page.addInitScript((epoch: number) => {
    const OriginalDate = Date
    class FrozenDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(epoch)
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          super(...(args as any))
        }
      }
      static now() {
        return epoch
      }
    }
    // @ts-expect-error — intentional global override for test determinism
    globalThis.Date = FrozenDate
  }, FROZEN_EPOCH_MS)

  // Neutralise any remaining animations / transitions at the DOM
  // level. `emulateMedia({ reducedMotion: 'reduce' })` only covers
  // prefers-reduced-motion; this also catches libraries that don't
  // honour it.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }`,
  })

  // Wait for web fonts to settle. `next/font/google` injects font-
  // face declarations that Playwright's default navigation doesn't
  // await. Without this, the first baseline run captures a fallback
  // font and every subsequent run captures Cormorant / Amiri.
  await page.evaluate(() => document.fonts.ready)
}

test.describe('S-010-VR · visual regression baseline', () => {
  test.skip(!RUN_VR, 'Visual regression runs only with RUN_VISUAL_REGRESSION=1 (see spec header for baseline flow).')

  for (const locale of LOCALES) {
    for (const screen of SCREENS) {
      test(`${screen.name} · ${locale}`, async ({ page }) => {
        await prepareDeterministicPage(page, locale)
        await page.goto(screen.path)
        // Extra safety: re-await fonts after the real page loads, in
        // case `/` doesn't trigger the same font set as `/signin`.
        await page.evaluate(() => document.fonts.ready)
        await expect(page).toHaveScreenshot(`${screen.name}-${locale}.png`, {
          fullPage: true,
          animations: 'disabled',
          // Small tolerances absorb sub-pixel antialiasing drift
          // between the baseline run and subsequent CI runs while
          // still catching real visual changes.
          maxDiffPixelRatio: 0.01,
          threshold: 0.2,
        })
      })
    }
  }
})
