# Session notes · cross-session handoff

Short, mutable notes that move context from one session to the next.
Not canonical — anything here that survives two sessions without
landing in code should graduate into `DECISIONS.md` or
`EXECUTION_PLAN.md` instead.

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
