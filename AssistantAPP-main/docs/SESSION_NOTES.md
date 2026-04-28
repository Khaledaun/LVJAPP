# Session notes · cross-session handoff

Short, mutable notes that move context from one session to the next.
Not canonical — anything here that survives two sessions without
landing in code should graduate into `DECISIONS.md` or
`EXECUTION_PLAN.md` instead.

---

## 2026-04-23 — Post-0.7 cleanup sprint (this branch)

**Scope.** `claude/post-0.7-a-005-dynamic-audit-X4mBc` —
originally the A-005 dynamic-route audit (D-025 §4), expanded
into a full post-0.7 hardening sprint. 17+ commits; full listing
in `docs/EXECUTION_LOG.md` under the 2026-04-23 entries.

**What landed.**

1. **A-005 dynamic-route audit** (D-025 §4) — `scripts/audit-
   dynamic.ts` + `lib/audits/dynamic.ts`; 8 routes fixed; required
   CI gate.
2. **D-026 audit numbering reconciliation** — A-005 = dynamic-
   route; A-011 = KB freshness (was `A-005` pre-reconciliation).
   Plan bumped 1.1 → 1.2.
3. **`runCron(req, cb)` helper** — `lib/cron.ts`; `CRON_SECRET`
   bearer; added to A-002 `GUARD_PATTERNS`.
4. **CSRF middleware** — `lib/csrf.ts` + `middleware.ts` wiring;
   `CSRF_MODE=off|report-only|enforce` staircase; no content-type
   exemption. 10 unit tests + 2-describe Playwright spec
   (`e2e-tests/csrf-smoke.spec.ts`, auto-skip unless enforce).
5. **Rate-limit middleware** — `lib/rate-limit.ts` +
   `middleware.ts` wiring; `RATE_LIMIT_MODE` staircase; rightmost
   XFF; 120 req / 60 s default; 11 unit tests.
6. **4 cron audit handlers** — `/api/cron/audit-{auth-weekly,
   tenant-nightly,jurisdiction-weekly,kb-staleness-weekly}/
   route.ts`. Each imports from `lib/audits/` (library refactor),
   returns JSON summary, always HTTP 200 + `ok: true|false`.
7. **Cron issue-opener** — `lib/audits/issue-opener.ts`; fetch-
   based GitHub REST with search-first dedupe under
   `cron-audit,<auditId>` labels; log-only without
   `GITHUB_TOKEN`. Wired into A-002 cron.
8. **A-008 + A-010 GitHub Actions workflows** — `.github/
   workflows/a008-deps.yml` and `a010-doc-discipline.yml`. Both
   moved off Vercel cron (serverless lacks dev-deps + git diff).
9. **`/api/agents/bootstrap`** — staff-guarded POST + idempotent
   `orchestrator.subscribeAgent`. Flags default OFF.
10. **Env validator** — `lib/env-validate.ts` +
    `scripts/check-env.ts` + preflight integration. 9 rules;
    dev downgrades to warnings.
11. **A-011 KB freshness audit** — walks `skills/**/*.md`,
    classifies FRESH / STALE / EXPIRED / INVALID / LEGACY. 14
    pre-v0.1 `SKILL.md` domain roots migrated to v0.1 frontmatter.
12. **`scripts/preflight.sh`** — local "allowed to deploy?"
    driver; required block mirrors CI `gates`.
13. **Audit library refactor** — `lib/audits/{auth,dynamic,
    tenant,jurisdiction,kb-staleness}.ts`. Scripts reduced to
    thin CLI wrappers.

**Progress snapshot** (see "Progress" section below for derivation):

- Engineering infrastructure / guardrails: **~85%** complete.
- Product features wired to real data: **~25%** complete.
- Integration layer (Stripe, Webflow, Twilio, ElevenLabs): **~15%**.
- Agent OS runtime: **~50%**.
- Production readiness: **~35%**.
- **Weighted aggregate: ~45%** of the full roadmap.

**Not on this branch (deliberately).**

- Supabase connect (D-025 items 1–3, 5) — waits on the pooler +
  direct URL provisioning.
- Flag flips (`CSRF_MODE`, `RATE_LIMIT_MODE`,
  `AGENT_*_ENABLED`) — operator action.
- Upstash backend for `checkRateLimit` — waits on env vars.
- Issue #11 risky half — separate branch.
- KB article substantive review — needs PT-licensed lawyer per
  D-024.

**Next session priorities.**

1. Review + merge this branch (or split into 2-3 PRs for tighter
   review scope — the 17+ commits fall naturally into:
   post-0.7 cleanup · cron handlers + issue-opener · GH Actions
   + env validator).
2. Flip `CSRF_MODE=report-only` on staging; grep Vercel logs for
   `[csrf] report-only` warnings.
3. Provision `CRON_SECRET` + `GITHUB_TOKEN` + `GITHUB_REPOSITORY`
   on Vercel prod; run `npm run env:check` to verify.
4. Kick off Supabase-connect PR (D-025 full checklist).

---

## 2026-04-23 — Cross-repo review (pass 2) — KhaledAunSite digest

**Scope.** The MCP allowlist for this session was again locked to
`khaledaun/lvjapp`, so `khaledaunsite` wasn't readable via MCP. The
user pushed a 7-file KhaledAunSite engineering digest into
`AssistantAPP-main/docs/` on main (files `01-architecture-and-stack`
through `07-starter-checklist`), which this pass reviewed and filed
under `AssistantAPP-main/docs/xrepo/khaledaunsite/`. Digest is the
team's own export from the KhaledAunSite project — more like a post-
mortem playbook than a live repo dump, so "no RLS policy file"
doesn't mean the project lacks RLS; it means the digest describes
their RLS intent, not the policies themselves.

### (1) Supabase RLS

- **Pattern in the digest.** Per-user `user_id = auth.uid()` with an
  `is_public` flag on tables that can be shared (01 "Key
  architectural decisions", 07 Week-1 checklist "Turn on RLS for
  every user-data table at the moment you create it", 02 AI-06
  "Search endpoints must scope: `user_id = auth.uid() OR is_public =
  true`"). Role / tenant GUCs are not used.
- **Does NOT supersede D-024.** KhaledAunSite is single-tenant
  per-user; LVJ is multi-tenant per-org. `auth.uid()` is a coarser
  key than `app.current_tenant()`, and their pattern doesn't address
  the cross-tenant case that D-023 / D-024 exist to solve. D-024
  stands as-is.
- **Two refinements worth adopting.**
  1. **RLS at table-creation time, not retrofit.** Digest explicitly
     lists "Defer multi-user RLS" under "What we would NOT do again"
     (01). Our current plan defers RLS until Supabase connects — not
     a defer of the decision, but of the physical migration. The
     risk is that new tables land between now and Supabase connect
     without an associated policy draft. **Action:** when we add any
     tenant-scoped model post-Sprint 0.5, the same migration PR
     records the `CREATE POLICY` stub in `packages/db/sql/rls-
     policies.sql` (even pre-connect). Add this to the DoD in
     EXECUTION_PLAN §11.1 when Supabase connects.
  2. **Knowledge / search endpoints need explicit scoping.** RLS
     covers the base table, but search/aggregation paths that hit a
     materialized view or FTS index often bypass it silently. The
     A-003 audit should grow a sub-check: any route that reads from
     `tsvector`/FTS/materialized-view sources re-asserts `tenantId`
     in the Prisma where clause. Captured in SESSION_NOTES (3)
     below for post-Sprint-0.7 follow-up.

### (2) Multi-tenant Stripe Connect

Absent from the digest — no `account_links`, no webhook rotation, no
`PlatformAccount` precedent. Same finding as pass 1. Sprint 8.5 /
Sprint 15 still have no sibling crib; Stripe docs + test mode are
the source of truth. No sprint re-ordering implied.

### (3) CI gate shape

Digest has no two-tier CI structure — just standard GH Actions
(`typecheck + lint + test + build`) plus a developer-side
`scripts/preflight.sh` with 14 named checks (03). **Not cleaner than
our `gates` + `legacy-checks` split.** But the preflight-script
pattern is worth cribbing as a separate tool: a one-command "am I
safe to push?" that runs A-002, A-003, A-004, A-010, prisma
generate, typecheck, lint, test, build, and `/api/health`. Lands as
a small follow-up (after Sprint 0.7), not in this PR.

### (4) BUGS.md / known-gaps that map onto LVJ's surface

Digest file 02 is essentially their pitfall catalogue. The items
that map onto Sprint 0.5+ work we've already done or are about to
do — recorded here so we don't re-discover them and don't silently
violate them:

| # | Pitfall (KhaledAunSite) | LVJ mapping |
|---|--------------------------|-------------|
| 1 | Next.js pre-renders API routes that touch DB at build → auth bypass on static routes behind middleware only | Every `app/api/*` route and every page that reads DB MUST declare `export const dynamic = 'force-dynamic'` + `export const revalidate = 0`. Add as an A-NNN audit when Supabase connects. |
| 2 | Prisma + PgBouncer silently breaks prepared statements | Runtime `DATABASE_URL` uses `:6543?pgbouncer=true&connection_limit=1`; `DIRECT_URL` uses `:5432` for migrations. **Binding on Supabase connect.** → D-025. |
| 3 | `PrismaClient`-per-route exhausts pool | We already have a singleton in `lib/db.ts` (`getPrisma()`). Preserve. Add lint/CI rule post-0.5.1. |
| 4 | Raw Supabase queries use table name, not Prisma model name | When raw SQL lands (RLS policies, cron jobs), `supabase.from('cases')` not `.from('Case')`. → D-025. |
| 5 | Supabase emails are case-sensitive | Normalize to lowercase at write + login. Applies to any new auth flow; NextAuth's email-providers already lowercase by default, confirm before switch. |
| 6 | Static pre-render + middleware auth = bypass | Mitigated by (1); call out again because it's the highest-severity of the set. |
| 7 | CSRF `Content-Type: application/json` exemption is a bypass | Our middleware should have no content-type exemption. Verify in a post-0.5.1 audit. |
| 8 | Rate limiter reads leftmost `X-Forwarded-For` | Use rightmost XFF or prefer `x-real-ip`. Applies when we add rate limiting. |
| 9 | Unauthenticated `/api/cron/*` endpoints | Our `vercel.json` crons already need a `CRON_SECRET` header check in the route. A-002 currently whitelists `INTENTIONAL_PUBLIC_ROUTES`; cron routes should be inside a `runCron(req, cb)` helper that checks the header, not on the public allow-list. Post-0.5.1 cleanup. |
| 10 | E2E tests hardcode paths | Derive from route config. Relevant for Sprint 0.7 Playwright. |
| 11 | Settings forms that don't persist | Every form gets a write → read-back test. Relevant for Sprint 0.7 and 8.5. |
| 12 | AI hallucinated citations / runaway cost / no circuit breaker | Covered by D-012 (cost caps). Circuit breaker + citation verifier to add in AOS Phase 2 design. Not new, but worth re-confirming. |
| 13 | PII leaked into AI self-learning memory | A-010 / `scripts/pii-scrub.ts` already in place. Extend to AOS memory stores. |

Items 2 and 4 are binding *patterns* for the first `supabase db
push`, not just advisory — captured as **D-025** in the same commit.
Items 1, 6–9 land as prevention items in the next post-Sprint-0.7
cleanup PR (post-migration cleanup + A-NNN for `force-dynamic`
audit).

### (5) What the digest says that LVJ is NOT adopting

- **Monorepo layout (`apps/web` + `apps/dashboard` + `packages/*`).**
  We're a single Next.js app at the repo root; splitting mid-stream
  is a large, risky migration for no customer-facing value. Noted
  for any future split, not now.
- **Supabase Auth replacing NextAuth.** Open architectural question
  already captured in the next-session block below; pass 2 doesn't
  change that status.
- **Israeli-legal skill pack + Hebrew fonts.** Different jurisdiction
  (D-006: Portugal + UAE) and different locale (D-015: Arabic +
  English). Pattern is useful, content is not.
- **4-brain AI architecture as a distinct service layout.** Their
  own digest says "don't literally build four services; build one
  `runAIRequest()` wrapper" — we already do this via `lib/agents/
  invoke.ts` (D-002). Validates our direction.

### (6) Actions taken in this commit

- `docs/xrepo/khaledaunsite/*` — the 7 digest files moved out of the
  canonical docs root into a dedicated subdirectory so they don't
  get mistaken for LVJ's own playbook.
- `docs/DECISIONS.md` D-025 — Supabase-connect contract: runtime vs.
  migration URL split, `@@map` discipline for raw queries, case-
  insensitive email normalization, `force-dynamic` on DB-touching
  routes. Complementary to D-024 from PR #13.
- `docs/SESSION_NOTES.md` — this section, appended above the pass-1
  section that landed via PR #13.
- `docs/EXECUTION_LOG.md` — dated entry for the PR.
- No EXECUTION_PLAN.md edits: PR #13 already edited §10 with pass-1
  cribs (Sprint 0.5.1 recipe + §10.5 / §10.8 Stripe-Connect absence
  notes). Pass-2 cribs that graduate into §10 — the RLS-stub-at-
  table-creation DoD (§11.1), the FTS-scoping A-003 sub-check
  (§2.1), the D-025 items as Supabase-connect preflight (§12.2) —
  land in the post-Sprint-0.7 cleanup PR alongside the other
  prevention items.

---

## 2026-04-23 — Cross-repo review (yalla-london + KhaledAun.com)

**Scope.** Intended targets: `khaledaun/yalla-london` and
`khaledaun/khaledaunsite`. `khaledaunsite` is **private** and outside
this session's MCP allowlist (locked to `khaledaun/lvjapp`); WebFetch
returns 404 on private repos. Fallback scope used: `yalla-london`
(public) and the adjacent public sibling `khaledaun/KhaledAun.com`.
A second pass against `khaledaunsite` should land when MCP scope
refreshes or the repo is read-shareable.

### (1) Supabase RLS patterns

- **yalla-london** — *no* RLS. App-layer scoping via a `siteId`
  column on every business model, backfilled to legacy rows. No
  `auth.uid()`, no `current_tenant()`. Validates D-023 (app-layer
  first, RLS defense-in-depth only).
- **KhaledAun.com** (`packages/db/sql/rls-policies.sql`) — RLS
  enabled but **role-based**, not tenant-based. Policies read
  `auth.jwt() ->> 'role'` with `COALESCE` across root claim,
  `app_metadata.role`, and `user_metadata.role`. Helper function
  `get_user_role()` declared `SECURITY DEFINER`. No
  `current_tenant()` and no `SET LOCAL`.
- **Footgun.** KhaledAun.com writes *only* `USING` — no `WITH CHECK`
  on its INSERT / UPDATE policies. That lets a caller update a row
  *into* a value that escapes the policy filter. For LVJ the RLS
  layer must use **both** `USING` and `WITH CHECK` on every write
  policy. Logged as D-024.

### (2) Multi-tenant Stripe Connect

**Neither repo** uses Stripe Connect. No cribs for `account_links`
onboarding, `return_url` signing, webhook rotation, or a
`PlatformAccount`-like model. Sprint 8.5 (onboarding) and Sprint 15
(payouts) will have to reference Stripe docs + test-mode directly
rather than an internal precedent. No blocking dependency surfaced —
the stated Task-3 priority order holds.

### (3) CI gate shape

- **yalla-london** — blocking chain
  `lint-and-typecheck → build-and-test → security-scan`; informational
  tier `migration-check` (PR-only), `lighthouse-ci`,
  `enterprise-compliance`, `full-test-suite` (main-only); final
  `detect-failures` job runs with `if: always()` and aggregates all
  prior job statuses into one composite PR signal. **Cleaner than our
  gates + legacy-checks split in one respect** — the aggregator gives
  a single observable status regardless of which informational leg
  wobbled. Worth cribbing when A-003 flips to blocking.
- **KhaledAun.com** — simpler `quality-checks → build-and-test →
  deploy`, with `security-scan` as a parallel informational branch.

### (4) Known-gaps carried over

From yalla-london `docs/known-gaps-and-fixes.md`:

1. **CJ-001 (RESOLVED).** Commission / click / offer models originally
   lacked `siteId` → cross-site financial leak. Fix: backfill
   `siteId` on every model touching money. Map to our `Payment`,
   `Commission`, `MarketingLead` — `tenantId` must be set at creation,
   never inferred at read time.
2. **Rule 64.** `OR: [{ siteId }, { siteId: null }]` backward-compat
   during migration windows keeps legacy unscoped rows visible to
   tenant queries.
3. **Rule 74.** Revenue queries must explicitly filter `siteId`.
   Equivalent for us: commission ledger + payout views.
4. **Rule 9.** `Promise.all` over 15+ Prisma queries exhausts Supabase
   PgBouncer's pool. Cockpit builders run sequentially. Applies to
   our `analytics-rollup` cron and any cross-tenant admin view.
5. **Rule 47.** Additive migrations use `ALTER TABLE ADD COLUMN IF NOT
   EXISTS`, not `CREATE TABLE IF NOT EXISTS`.
6. **Rule 3.** Use `{ not: "" }`, not `{ not: null }`, on non-nullable
   `String` columns (Supabase runtime crash).
7. **Rules 39 + 80.** `requireAdmin` return MUST be checked; auth
   guards MUST execute BEFORE feature flags / rate limiters. Our
   `runAuthed()` already fuses these structurally — preserve that.

### (5) Actions taken in this commit

- **D-024** opened (Supabase RLS: both `USING` and `WITH CHECK`,
  `app.current_tenant()` via `SET LOCAL`).
- `EXECUTION_PLAN.md` §10 gains **Sprint 0.5.1** recipe carrying the
  cribs above; §10.5 (8.5) and §10.8 (15) gain a sentence noting the
  absence of Stripe-Connect precedent.
- No sprint re-ordering. Sprint 0.5.1 remains the next unit per D-019.

---

## 2026-04-23 — for the next session

### (1) Cross-repo review: `yalla-london` and `khaledaunsite`

The GitHub App now has **All repositories** access, but *this*
session's MCP scope was baked in at startup
(`restricted to khaledaun/lvjapp`). Starting a **new session**
refreshes the scope and makes these callable via MCP.

What to look for when those repos come online:

1. **Supabase RLS policy patterns.** Before wiring RLS per D-023
   defense-in-depth, audit:
   - `policies/*.sql` or similar — do they use `auth.uid()` or a
     custom `app.current_tenant()` function?
   - How is the tenant id propagated from NextAuth session → `SET
     LOCAL`? We need the same mechanism in `lib/db.ts`.
   - Per-table SELECT / INSERT / UPDATE / DELETE policy split vs.
     one combined USING/WITH CHECK.
2. **Multi-tenant Stripe Connect flows** (relevant to Sprint 8.5
   and Sprint 15). Look for:
   - `account_links` onboarding initialization — where is the
     `return_url` built, and how is it signed to prevent replay?
   - Webhook signature rotation — do they store multiple endpoint
     secrets for graceful rotation?
   - `PlatformAccount` (or similar) schema — how do they map the
     Stripe account to our `TenantContract.stripeAccountId`?
3. **CI patterns.** We're running a `gates` + `legacy-checks` split
   (see `.github/workflows/ci.yml`). If either repo has a cleaner
   two-tier gate structure worth cribbing, note it.
4. **Known-gap list.** If either repo carries a `BUGS.md` or
   equivalent, scan for anything that maps onto our Sprint 0.5+
   surface so we don't re-discover the same bugs.

### (2) Immediate follow-ups in priority order

When resuming after this session:

1. **Sprint 0.5.1** — migrate 24 `app/api/*` routes off `guard* +
   inline prisma` onto `runAuthed(...)`. Each route is mechanical:
   ```ts
   export async function GET(req, { params }) {
     return runAuthed({ caseId: params.id }, async (user) => {
       const prisma = await getPrisma()
       // existing body here
     })
   }
   ```
   When the 24 are migrated, flip A-003 from `continue-on-error:
   true` to blocking and fold it into the `gates` job.

2. **Close Sprint 0.7** — add Playwright visual-regression spec for
   EN + AR landing screens per EXECUTION_PLAN §10.4 exit criteria
   ("Visual regression baseline recorded for EN + AR").

3. **Issue #11** — cleanup of 41 pre-existing TS errors. Safe half
   first: zod v4 `z.record` migration, test-utils Session shape,
   jest-mock `any → never` typings. Risky half (recharts React type
   drift, `lib/agents/invoke.ts` generics) needs separate scoping.

4. **Supabase connect** (when the user lands infra). Then:
   - Run `npx prisma migrate deploy` locally against Supabase.
   - Write the RLS policy file after cross-referencing the patterns
     from `yalla-london` / `khaledaunsite`.
   - Add a new CI job `db-migrations` that validates migrations
     apply cleanly to a fresh Postgres.

### (3) Open architectural questions (not yet D-NNN)

- **Background jobs across tenants.** The deadline-agent cron sweeps
  all cases; under D-023 it needs to iterate tenants explicitly
  (one `runPlatformOp` per tenant, or a `forEachTenant` helper). Not
  a blocker until AOS Phase 2.
- **Supabase Auth migration.** NextAuth is the current session
  provider. If we switch to Supabase Auth for user-facing sessions
  (likely when RLS lands), the `SessionUser.tenantId` resolution path
  changes. Keep both paths optional behind a feature flag during the
  transition.
- **Provider vs. tenant distinction.** `TenantContract.commissionPct`
  and `freeTierExpiresAt` conflate "operating firm" with "payer
  firm". Sprint 15 will need to split these; capture as a D-NNN when
  the Stripe Connect identifiers promote into a `PlatformAccount`
  model.

---

## How to use this file

1. Append a dated section at the top of "for the next session" when
   you hit an item that crosses a session boundary.
2. Remove items once they land (don't strike through).
3. Graduate anything that outlives two sessions into
   `docs/DECISIONS.md` or `docs/EXECUTION_PLAN.md`.
