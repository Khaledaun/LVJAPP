# 02 — Known Pitfalls & Fixes (encode these as rules)

Each entry is **Problem → Rule**. If a rule has a lint/CI check, add it. Sources are real post-mortems in this repo.

## Build / CI

- **Next.js tries to pre-render API routes that hit the DB during build.** → Every API route and every page that reads DB/Supabase/remote must declare `export const dynamic = 'force-dynamic'; export const revalidate = 0;`. Add an ESLint or CI check that flags routes without it when they import `prisma` or `@supabase/supabase-js`. (`BUILD-TIME-DATABASE-FIX.md`)
- **`useSearchParams()` in a client component breaks the build without a Suspense boundary.** → Wrap any component calling `useSearchParams()` in `<Suspense>` and use it with a typed fallback. (`BUILD-FIXES-APPLIED.md`)
- **Vercel can't resolve `file:`-protocol workspace packages transitively.** → Use pnpm workspaces with `workspace:*`, and either Turborepo with explicit `build` outputs or flatten transitive packages into the app. Don't hand-roll symlinks. (`DEPLOYMENT-FIX-LOG.md`)
- **`next-intl` + static pages + `unstable_setRequestLocale` blow up.** → `generateStaticParams()` on the locale layout, `force-dynamic` on the pages that need runtime data, `localePrefix: 'as-needed'` in middleware. (`BUILD-FIXES-APPLIED.md`, `HYBRID-APPROACH-FIX.md`)

## Database / Prisma / Supabase

- **Prisma + PgBouncer silently breaks prepared statements.** → `DATABASE_URL` for pooler uses port `6543` and `?pgbouncer=true&connection_limit=1`. Set a separate `DIRECT_URL` on port `5432` for migrations. (`SPRINT-1-DATABASE-FIX.md`, `VERCEL-DATABASE-FIX-GUIDE.md`)
- **PrismaClient-per-route exhausts the pool.** → One singleton exported from `packages/db`. Period. (`LAWRA_PROJECT_SUMMARY_REPORT_PART1.md`)
- **Raw Supabase client queries use `Model` name, not table name.** → Always use the `@@map` target in `supabase.from('users')`, never `supabase.from('User')`. (`AUTH-FIX-COMPLETE.md`)
- **Supabase scheduled maintenance produces confusing "Database error finding users" from auth admin calls.** → Before blaming the app, check `status.supabase.com`. Add retry with exponential backoff on auth admin calls. Add a health check that exercises `auth.admin.listUsers()`. (`KNOWN_ISSUES.md`)
- **Supabase emails are case-sensitive.** → Normalize to lowercase on write and on login. Don't let two `Khaled@x` and `khaled@x` users exist. (`KNOWN_ISSUES.md`)

## Auth / session / middleware / redirect loops

- **Static pre-render + middleware auth = auth bypass** (static HTML is served to all users). → Any page behind auth: `export const dynamic = 'force-dynamic'`. Middleware alone does not make a page dynamic. (`BUILD-TIME-DATABASE-FIX.md`)
- **`localePrefix: 'always'` without `generateStaticParams` crashes RSC.** → Hybrid: `generateStaticParams` in the locale layout + `force-dynamic` on data pages + `localePrefix: 'as-needed'` in middleware. (`HYBRID-APPROACH-FIX.md`)
- **Redirect loops from mismatched locale detection between middleware and page.** → Single source of truth for locale: middleware sets a cookie; pages read the cookie. Don't infer locale from `Accept-Language` in the page layer. (`REDIRECT-LOOP-DEBUG.md`)

## i18n / RTL / Hebrew-Arabic

- **`NextIntlClientProvider` without an explicit `locale` prop defaults to English.** → Always pass `locale` AND `messages` explicitly. Hydration mismatches otherwise. (`ARABIC-TRANSLATION-FIX-FINAL.md`)
- **Client components with `useTranslations()` are baked English into static HTML, then served to `/ar`.** → Force dynamic on localized routes or guarantee the locale is passed from server and rehydrated on the client. Test `/ar`, `/he`, `/en` in incognito after each deploy. (`ARABIC-TRANSLATION-ROOT-CAUSE.md`)
- **`NEXT_PUBLIC_*` added to Vercel after the build → not in the client bundle.** → Set them before the first build. To pick up new `NEXT_PUBLIC_*` values, trigger a fresh build (new commit or CLI `vercel --prod`), not the "Redeploy" button. (`SOCIAL-ICONS-FIX-EXPLANATION.md`)
- **Physical CSS properties (`ml-*`, `mr-*`, `text-left`) break RTL silently.** → Logical only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`. Add an ESLint rule banning the physical variants in `apps/`.
- **Structured data (emails, URLs, phone numbers, IBAN, currencies) rendered inside RTL containers looks wrong.** → Wrap in `<span dir="ltr" className="ltr tabular-nums">…</span>` LTR islands.
- **Directional icons (arrows, chevrons) point the wrong way in RTL.** → Add a `rtl-flip` utility class: `transform: scaleX(-1)` scoped to `[dir="rtl"]`.

## Deployment / Vercel / env vars

- **Build env can't reach production DB.** → Mark data routes `dynamic`, never assume the build server can hit your DB. Test the build path locally with `pnpm build` before pushing. (`BUILD-TIME-DATABASE-FIX.md`)
- **Env var set in Vercel but wrong "environment target" selected.** → Set for Production, Preview, and Development explicitly. Diff the three. Our `VERCEL-ENV-VARIABLES-CHECKLIST.md` has the matrix — copy it. (`DEPLOYMENT-FIXES-COMPLETE.md`)
- **"Redeploy" button reuses the artifact, not the env.** → For new `NEXT_PUBLIC_*`, push a commit or trigger a rebuild via CLI / API. Don't rely on "Redeploy". (`SOCIAL-ICONS-FIX-EXPLANATION.md`)
- **Each Vercel project needs its own Root Directory set** (`apps/web`, `apps/dashboard`). Framework preset: Next.js. Node version pinned.

## Security / audit findings

- **CSRF bypass via `Content-Type: application/json` exemption.** → No exemptions. Every state-mutating request validates a CSRF token. (`REMEDIATION_PLAN.md` SEC-03)
- **Rate limiter reading the wrong entry of `X-Forwarded-For`.** → Prefer `x-real-ip`. If using XFF, take the **rightmost** entry (closest to your edge), not the leftmost. (`REMEDIATION_PLAN.md` SEC-05)
- **PII leaked into AI self-learning memory.** → Redact emails, phones, case IDs, names before storing any assistant response for retrieval. Consent-gate AI processing at the user level. (`REMEDIATION_PLAN.md` AI-08, PRIV-03)
- **Unauthenticated cron endpoint.** → All `/api/cron/*` and admin tasks require a `CRON_SECRET` header or service-role JWT check in middleware. Reject with 401 at the edge. (`LAWRA_PROJECT_SUMMARY_REPORT_PART1.md`)
- **2FA not enforced on protected routes.** → `requireAuth` middleware must also verify 2FA-elevated session for admin-tier actions. (`REMEDIATION_PLAN.md` SEC-01)

## Testing / E2E

- **E2E tests hardcoded `/insights` when the route was `/blog`.** → Generate paths from the route config; don't hardcode. Run E2E against both `/en` and `/ar` (and any other locales). Test redirect chains, not just final URLs.
- **Smoke tests that only hit the homepage miss 95% of real failures.** → At minimum: create a record, read it back, update it, delete it, across at least one protected route. Add a synthetic user in staging for this.
- **Settings form that doesn't persist.** → Every form gets a "write → read-back" test that reloads the page and asserts the value. No exceptions.

## LLM / AI operations

- **Hallucinated citations that look plausible.** → Every AI response that cites a source goes through a verifier that confirms the source exists and the referenced section is real. Surface verification status to the user (green/yellow/red badge). (`REMEDIATION_PLAN.md` AI-11)
- **Runaway cost.** → Daily and monthly spend ceilings per tier, enforced in middleware (`OPS-01`). Reject with `402` / `429` when exceeded. Never blow through silently.
- **No circuit breaker for AI providers.** → Add a breaker that opens after N consecutive failures, serves a graceful fallback ("AI is temporarily unavailable — your data is safe"), and half-opens on a timer. (`REMEDIATION_PLAN.md` OPS-07)
- **Token pricing out of date.** → Keep the cost model in one constants file; update monthly; unit-test the math against fixture responses. (`OPS-02`)
- **No knowledge RLS for keyword search.** → Search endpoints must scope to the caller: `user_id = auth.uid() OR is_public = true`. It's easy to forget on a search path. (`AI-06`)

---

**The shortest useful version of this page:** set `force-dynamic` on data routes, use the Prisma singleton, use `?pgbouncer=true` on port 6543, pass `locale` to `NextIntlClientProvider`, use logical CSS, enforce CSRF on all JSON requests, and redact PII before it touches an LLM. That alone would have saved this project weeks.
