# Decision Log

> Lightweight ADR log. One entry per **decision the user made in
> conversation** (or that an engineer made in a PR). The goal is to make
> every "why" searchable by grep, so future sessions don't re-litigate
> settled questions.
>
> Format: `D-NNN · title · status · date · one paragraph rationale`.
> Keep each entry under ~10 lines. Don't rewrite a decision — add a new
> entry that supersedes it.

---

## D-001 · Native Next.js automation; no n8n / Zapier / external workflow tools

- **Status:** accepted · 2026-04-22 · founder
- **Source:** user said *"I don't want to use n8n i prefer native
  automation (unless way more easier)"*. Already in `Claude.md`
  §Architecture Decisions #1 — restated here so the reason is searchable.
- **Consequence:** every automation is a Next.js API route, a Vercel cron
  handler, or an Agent OS agent (`agents/<id>/`). Event bus is
  `lib/events.ts` (GR#5). No BPMN, no Zapier, no n8n webhook relays.

---

## D-002 · LVJ Agent Operating System replaces ad-hoc automation

- **Status:** accepted · 2026-04-22 · founder
- **Source:** user approved the improved AOS plan after I rejected a
  flat "20 agents" draft in favour of a contract-first, 4-tier
  architecture (Services / Workflow / Channel / Surface + Background).
- **Consequence:** all agent work lands through `lib/agents/invoke.ts`
  with manifest + zod schemas + versioned prompt + SKILL.md. See
  `docs/AGENT_OS.md` §4 for the full contract. No agent ships without
  the 12-box Definition of Done (§13).
- **Superseded items:** the "20 agents" wishlist is now a roster table
  (AGENT_OS.md §7.4) with explicit phase placement.

---

## D-003 · Arabic / multilingual UI on hold through Phase 4

- **Status:** **superseded-by: D-015** · 2026-04-22 · founder
- **Source:** user said *"Put the Arabic pages on hold, too soon for
  multi language"*.
- **Consequence:**
  - `AppShell` keeps the `rtl` prop and RTL CSS so the layout doesn't
    have to be rebuilt later, but no route ships with `rtl=true` in v1.
  - Amiri is preloaded by `next/font` (cheap) but only used by the
    sign-in page's motto.
  - `Claude.md` §Product Identity already marks AR/PT as deferred —
    this decision formalises the scope cut.
  - The Intake wizard offers AR/PT as client **preferred language**
    metadata (captured on the lead) but the app copy stays EN.
  - `core/languages.md` in the Core KB will state "EN only v0.1".

---

## D-004 · UI track before AOS runtime

- **Status:** accepted · 2026-04-22 · founder
- **Source:** user replied "3 then 2" when offered the choice between
  continuing UI porting (option 3) or starting AOS Phase 1 (option 2).
- **Consequence:** UI ports (Cases list, Case detail, Intake wizard,
  Notifications) landed first in commit `42dde49`. AOS Phase 1 landed
  next in `3e15819`. Front-end shell + surfaces are on-brand before
  the agent runtime is armed.

---

## D-005 · Documentation updates are a commit-level discipline

- **Status:** accepted · 2026-04-22 · founder
- **Source:** user said *"Update execution plan and documentation and
  update them after each commit and where there are information that i
  give you in conversation for future reference purposes"*.
- **Consequence:** every commit touches `docs/EXECUTION_LOG.md` in the
  same PR with a new section. Conversation decisions land here as new
  `D-NNN` entries. `Claude.md` is bumped only when architecture shifts.
  This rule is encoded in `Claude.md` §Documentation Discipline so
  future sessions pick it up automatically without re-asking.

---

## D-006 · Jurisdiction reset — US → Portugal (primary) + UAE (v1.x)

- **Status:** accepted · 2026-04-22 · founder
- **Source:** PRD v0.3 §1 "Problem", §4.3 "Legal & compliance", §6.3
  "Out of scope". Ratified during the same review that produced the
  `D-007`…`D-019` block.
- **Consequence:** the product's target jurisdictions are **Portugal
  (primary)** and **UAE (v1.x)**. US immigration support is explicitly
  out of scope for v1.0. Every US-specific surface — USCIS forms,
  RFE drafter, EB5 / H1B / N400 service types, IOLTA trust
  accounting, ABA Model Rule 1.6 disclaimers, DS-160 automation — is
  scheduled for removal or re-targeting in subsequent PRs. Anywhere
  legacy US content sits, a one-line note points back to this
  decision so grep traces resolve.
- **Rationale:** LVJ's commercial wedge is MENA-source clients
  relocating to Portugal. A US-market pivot was never modelled in the
  funnel, regulatory stack, or lawyer licensing. Shipping a US
  surface alongside PT is a cost without a customer.
- **Implementation:** Phase 5 sprint plan (Sprint 4 intake service
  types, Sprint 8 CTA replacement for IOLTA, `skills/*` rewrites, env
  var deprecations in Phase 6) tracks the re-target. Re-targeting is
  mechanical, not conceptual — none of the platform primitives change.

---

## D-007 · Commission rate: flat 25%

- **Status:** accepted · 2026-04-22 · founder
- **Supersedes:** earlier 50% (legal) / 30% (other) proposal — never
  landed.
- **Consequence:** LVJ Platform takes a flat **25% commission of fees**
  across **all service categories** (lawyer, realtor, accountant/tax,
  fund manager, translator, apostille, bank facilitator,
  relocation/concierge, property management, hospitality, and any future
  categories Platform Admin adds). Simpler to explain; one rate in
  `lib/commission.ts`. Trade-off accepted: leaves money on the table on
  high-margin legal work. Revisiting requires per-`ServiceProvider`
  commission versioning + retroactive ledger handling.

---

## D-008 · Outcome predictor data thresholds

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** Sprint 11 predictor is gated by data volume before
  exposure.
  - **Staff-internal** (Tenant Lawyer / Admin): predictions shown when
    `CaseOutcome` count ≥ **50** for that
    (`destinationJurisdiction`, `serviceTypeCode`) pair; CI always
    displayed.
  - **Client-facing in portal**: predictions shown when count ≥ **200**
    AND CI ≤ ±15%. Below: "Insufficient data — too few comparable cases".
- Misrepresenting odds in a legal-adjacent context has UPL exposure.
  `lib/predictor.ts` enforces thresholds before returning numeric output.

---

## D-009 · Free tier boundary

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** **First 5 providers free for 12 months.** Slot
  allocation at Platform Admin discretion, recorded in the
  tenant/provider contract row. After expiry: per-seat / package SaaS
  subscription **plus** 25% commission (D-007). Subscription does not
  displace commission.
- Tracking: `Tenant.freeTierExpiresAt` + `ServiceProvider.freeTierExpiresAt`.
  Sprint 15 cron sweeps 30 days prior.

---

## D-010 · Marketing-HITL SLA: 24h

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** all marketing content (blog drafts, social posts,
  public Service Provider Directory listings, AI-generated visa-explainer
  updates) requires marketing-HITL approval within **24 hours** of
  entering the queue at `/admin/marketing-approvals`.
  `HITLApproval.tier = 'MARKETING'`; SLA breach surfaces on Platform
  Marketing dashboard.

---

## D-011 · Webflow staging strategy

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** Marketing agents publish drafts via Webflow's
  built-in unpublished/draft state on the live site. No separate staging
  Webflow site (doubles cost, needs sync infra). D-010 marketing-HITL is
  the safety net.
- `lib/webflow.ts#publishDraft()` uses Webflow draft mode;
  `approvePublish()` calls the publish endpoint after marketing-HITL
  approval.

---

## D-012 · LLM cost caps

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** daily cost caps enforced by `services/cost-guard.ts`
  against rolling 24h `AutomationLog.costUsd` sum per scope. Reset UTC
  midnight. Override: Platform Admin only, audit-logged with reason.

  | Scope              | Soft (warn + pause non-critical) | Hard (pause all) |
  |--------------------|----------------------------------|------------------|
  | Per tenant         | $50/day                          | $100/day         |
  | Platform marketing | $30/day                          | $75/day          |
  | Platform-wide      | —                                | **$200/day**     |

---

## D-013 · HITL escalation tiers

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** four tiers, routed by `services/orchestrator.ts` off
  `escalation.*` event type; `/admin/approvals` UI sorts by tier.

  | Tier      | SLA                                       | Triggers                                                                                         |
  |-----------|-------------------------------------------|--------------------------------------------------------------------------------------------------|
  | Standard  | 4h                                        | General advice review, routine outbound                                                          |
  | Urgent    | 1h                                        | `escalation.urgent_deadline` (visa <72h, hearing within 7d)                                      |
  | Critical  | 15 min business hours / paged off-hours   | `escalation.adverse_notice` (denial received), `escalation.criminal_history` (intake disclosure) |
  | Marketing | 24h                                       | All marketing content (per D-010)                                                                |

  Off-hours pager: critical-tier only. Pager rotation per tenant.

---

## D-014 · Quiet hours: per-provider availability

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** each Service Provider sets own availability windows
  (days of week + start/end in local TZ). Orchestrator suppresses
  non-pager outbound during off-hours. Fallback: platform default
  **21:00–08:00 client-local** quiet hours.
  `ServiceProvider.availabilityWindows` JSON; `lib/scheduling.ts` checks
  before dispatch. Pager-tier (D-013 critical) ignores quiet hours.

---

## D-015 · Arabic is first-class for v1

- **Status:** accepted · 2026-04-22 · founder
- **Supersedes:** `Claude.md` v3.2 §Golden Rule #6 commentary ("AR
  structure reserved, EN only for v1") and **D-003** ("Arabic /
  multilingual UI on hold through Phase 4").
- **Consequence:** v1 ships with Arabic as a fully equal locale to
  English. No "EN-first, AR-later" workaround.
  1. Full RTL layout in app + portal (bidi handling, mirrored nav,
     RTL-aware shadcn/ui components).
  1. Typography pairing: **Amiri** display (≥18px, pairs with Cormorant
     Garamond), **IBM Plex Sans Arabic** body (pairs with Inter); Latin
     JetBrains Mono for IDs (SEF/AIMA convention keeps case IDs and
     dates in Latin script).
  1. AI Counsel chat fluent in AR (Claude 3.7 / GPT-5).
  1. AR document OCR (Gemini 2.5 Pro vision).
  1. AR drafting agents for client letters, additional-evidence
     responses, intake summaries.
  1. AR voice via ElevenLabs `eleven_multilingual_v2` +
     `ELEVENLABS_VOICE_ID_AR`.
  1. AR notification templates for email, SMS, WhatsApp, push, in-app.
  1. AR eligibility quiz at `/eligibility` and embedded on Webflow
     `/ar`.
  1. **Native Arabic speaker** in the marketing-HITL chain for all AR
     content.
  1. New skill `skills/arabic-localization/SKILL.md` (RTL patterns,
     typography, transliteration of names for SEF/AIMA forms).
  1. Locale routing: every URL has `/ar` equivalent; locale persists
     across Webflow ↔ app ↔ portal.
- Rationale: MENA-source clients to Portugal is the primary market.
  Arabic-as-afterthought kills trust on first session.
- Implementation: Sprint 0.7 stands up design-system + i18n; every
  subsequent UI sprint ships EN + AR or it doesn't ship.

---

## D-016 · Stripe Connect from day 1

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** Provider payouts use Stripe Connect from launch — no
  manual invoice/wire-transfer for the first cohort. Sprint 8.5
  (self-serve onboarding) includes Stripe Connect Express onboarding for
  providers; Sprint 15 ships monthly settlement cron.
- Rationale: manual settlement is painful even at low volume; doing it
  later means re-doing every provider's onboarding.

---

## D-017 · Public Service Provider Directory in v1

- **Status:** accepted · 2026-04-22 · founder
- **New product surface** introduced during PRD v0.3 review.
- **Consequence:** approved + active providers can opt into a public
  listing on `lvj-visa.com/providers` and `/providers/[slug]`.
  - `ServiceProvider.publicListingOptIn: boolean` (default false).
  - `ServiceProvider.publicProfile: Json` (name, photo, bio, languages,
    jurisdictions served, optional aggregate ratings).
  - Flow: provider opts in via `/provider/settings` → marketing-HITL
    approves listing copy (tier MARKETING, 24h SLA per D-010) → published
    to a Webflow CMS Collection via Data API.
  - Single source of truth = Prisma; Webflow is a render layer.
  - Public pages support EN + AR per D-015.
- Strategic intent: visibility = lead flow → incentive for providers to
  engage actively.
- Risk (R13): directory becomes spam target → marketing-HITL per listing
  + Platform-Admin suspension power.
- Implementation: Sprint 10.5.

---

## D-018 · Analytics & cross-tenant data access

- **Status:** accepted · 2026-04-22 · founder
- **Consequence:** three access tiers.
  1. **Per-user + per-tenant analytics:** full granularity, available
     to Tenant Admin for their own data only.
  1. **Platform Marketing cross-tenant view:** aggregated + anonymised +
     minimum **5-case k-anonymity**. Content-targeting only.
  1. **Platform Admin cross-tenant view:** full PII access. Every
     cross-tenant PII access writes `AuditLog action:
     cross_tenant_pii_access`. Affected Tenant Admins get a monthly
     access summary.
- `lib/analytics.ts` exposes three views with different query shapes;
  `lib/audit.ts` writes `cross_tenant_pii_access`; monthly cron
  generates per-tenant summaries.

---

## D-019 · Sprint priority order

- **Status:** accepted · 2026-04-22 · founder
- **Supersedes:** original `Claude.md` v3.2 Phase 5 sprint ordering for
  Sprints 0.x and 9–10.
- **Consequence:** execution order is:
  1. **Sprint 0.1** — close 11 unauthed routes (security debt; loop not
     safe to arm until done).
  1. **Sprint 0.5** — multi-tenancy foundation (`Tenant` model,
     `tenantId` middleware, `assertTenantAccess()`, isolation test
     suite).
  1. **Sprint 0.7** — AR + RTL into design system + i18n (per D-015).
  1. **Sprint 8.5** — self-serve tenant + provider onboarding (Stripe
     Connect onboarding per D-016).
  1. **Webflow webhook → MarketingLead** (smallest marketing-automation
     piece; unblocks lead attribution).
  1. **AOS Phase 2** (deadline + WhatsApp/voice/internal-msg + KB RAG +
     consent model).
  1. **Sprint 15** — Stripe Connect provider payouts + commission
     ledger.
  1. **Sprint 10 + 10.5** — Service Provider Pool + Public Directory.
- Remaining sprints (B/C/D) execute per PRD v0.3 §6.1 phasing.
- Founder may rearrange but engineering won't reorder without a
  superseding decision.

---

## D-020 · Drafting owns intent; channels own delivery

- **Status:** accepted · 2026-04-22 · engineering
- **Renumbered:** originally logged as `D-006`; moved to `D-020` in the
  `Claude.md` v4.0 re-baseline PR to free `D-006`…`D-019` for the
  PRD v0.3 decision block. `git log` on this file shows the prior
  number for archaeological grep.
- **Source:** AGENT_OS.md §2 principle 7, chosen because the original
  draft had every channel agent re-prompting for its own copy (large
  prompt + legal surface, easy drift between channels).
- **Consequence:** `agents/drafting/` is the single writer; `agents/
  email/` / `agents/whatsapp/` / `agents/voice/` are deterministic
  adapters with zero LLM calls. Channel-specific length caps and
  consent live in the channel agent, not the drafter.

---

## D-021 · Design source = claude.ai/design pack, not the legacy repo

- **Status:** accepted · 2026-04-22 · founder
- **Renumbered:** originally logged as `D-007`; moved to `D-021` in the
  `Claude.md` v4.0 re-baseline PR so the PRD v0.3 block (`D-007`…`D-019`)
  could land at its canonical numbers.
- **Source:** user delivered the design bundle via
  `https://api.anthropic.com/v1/design/h/JGhnOWc_NUr-I6eLhcYBUw?open_file=LVJ+Case+Management.html`
  (extracted to `/tmp/lvj-design/` during the session).
- **Consequence:** new screens derive from the design pack's tokens and
  component patterns (`shared.css`, screen JSX in `LVJ Case
  Management.html`), not from the legacy shadcn-based UI in the repo.
  Legacy `components/ui/*` stays untouched for back-compat;
  `components/lvj/*` is the canonical new library. When design and
  legacy conflict, design wins for new routes; legacy wins where it
  already ships functionality (e.g. `components/ui/TrafficLightBadge`
  in the case-detail tab bodies).

---

## D-022 · Master Execution Plan + Bugs log are first-class artefacts

- **Status:** accepted · 2026-04-22 · founder
- **Source:** user request to build a full execution plan covering
  auditing, smoke testing, bug + fix logging, continuous learning,
  and multi-agent Claude Code orchestration — with explicit security,
  testing, safety, and timeout awareness both while *writing* and
  *executing* the plan.
- **Consequence:**
  1. New canonical artefact `docs/EXECUTION_PLAN.md` (v1.0) — the
     *operational* spine. Covers timeout protocol, artefact map,
     audit framework (A-001…A-010), smoke battery (S-001…S-013),
     severity scale + review cadence for bugs, continuous learning
     loop (HITL diffs → KB → D-NNN), two-surface multi-agent
     orchestration (AOS in-product vs Claude Code build), full
     logging / correlation-id contract, security control matrix
     (C-001…C-025), threat model snapshot, timeout runbook, per-
     sprint recipes aligned to D-019, Definition of Done, open
     items.
  1. New canonical artefact `docs/BUGS.md` — single source of truth
     for defects; seeded with `B-000` meta entry. Format, severity,
     auto-population from smokes + audits, and review cadence are
     governed by `EXECUTION_PLAN.md` §4.
  1. `Claude.md` §1 Artefact map (future) and §Quick Start (future)
     will be updated to reference both files in the next
     architecture-touching PR; this PR is doc-only so the reference
     is added via `EXECUTION_PLAN.md` §1 without bumping
     `Claude.md`.
  1. Process conflicts resolve in favour of `EXECUTION_PLAN.md`;
     architecture conflicts in favour of `Claude.md`; product
     conflicts in favour of `PRD.md`; sprint ordering in favour of
     D-019 in this file.
  1. Auto-population scripts (`scripts/smoke/report-failures.ts`,
     `services/audits/*`) are scheduled deliverables, not prereqs —
     the contract is live as of this PR; scripts land incrementally
     per `EXECUTION_PLAN.md` §12.1.
- **Rationale:** the repo had the *what* (PRD, Claude.md, AGENT_OS)
  and the *history* (EXECUTION_LOG, DECISIONS) but no binding *how*
  — how work is audited, smoke-tested, logged, learned from, and
  decomposed across Claude Code subagents without blowing
  timeouts. Without that spine every sprint re-derives process from
  conversation, which is both slow and unsafe.
- **Implementation PRs.** This PR
  (`claude/execution-plan-framework-Ls8tj`) lands the contract.
  Sprint 0.1 (next) is the first sprint to execute under it.

---

## D-023 · Tenant isolation at the app layer; Supabase RLS is defense-in-depth, not the primary gate

- **Date.** 2026-04-23
- **Status.** accepted
- **Context.** Sprint 0.5 lands the multi-tenancy foundation. Before
  Sprint 8.5 (onboarding), Sprint 15 (payouts), and the marketing-
  HITL queue (D-010) can ship, we need one source of truth for "which
  rows may this request touch?". Supabase provides Postgres RLS; the
  app also has Prisma middleware. Which is the primary gate?
- **Decision.** The **app layer** is the primary gate:
  1. Every business model carries a `tenantId` column, denormalized
     down to child tables (Document, Payment, Message, etc.) for RLS
     friendliness and query-plan simplicity.
  2. A Prisma client extension (`buildTenantExtension` in
     `lib/tenants.ts`) auto-filters reads and auto-sets `tenantId`
     on writes when a request has an active `TenantContext`
     (AsyncLocalStorage).
  3. Route handlers enter a context via `runAuthed(guard, handler)`
     or the explicit `runPlatformOp(user, reason, cb)` escape hatch
     for LVJ_* staff. Every `runPlatformOp` writes an `AuditLog`
     row with `action='platform.cross_tenant'`.
  4. Supabase RLS lands as a **second layer** when infra connects.
     It is strictly additive; the app-layer gate never goes away.
- **Why app-layer first, not RLS-first.**
  - Development velocity: the middleware works today, sandbox-
    without-DB (`SKIP_DB=1`). RLS requires session propagation,
    role mapping, and a migration-managed policy file.
  - Debuggability: a TypeScript error ("no tenant context") is
    easier to trace than a Postgres `permission denied` surfacing
    deep in a Prisma stack.
  - Defense-in-depth: RLS layered on app-layer scoping is strictly
    additive. The reverse leaves a class of bugs — raw SQL in a
    repl, a background job missing `SET LOCAL tenant_id`, a Prisma
    middleware disabled by a config typo — silently cross-tenant.
- **Consequences.**
  - Every new route handler MUST enter a tenant context.
    `scripts/audit-tenant.ts` (A-003) fails CI if a new route uses
    Prisma without a tenant helper.
  - `TENANT_SCOPED_MODELS` in `lib/tenants.ts` MUST agree with the
    Prisma schema. A-003 also fails if the two drift.
  - `User`, `NotificationLog`, `VoiceCallLog`, `AuditLog`,
    `AutomationLog` keep `tenantId` nullable so platform-level rows
    can still land. Middleware accepts null on reads but refuses
    writes from a null context unless wrapped in `runPlatformOp`.
  - `Tenant`, `PartnerRole` are not tenant-scoped themselves.
    `TenantContract` has a `tenantId` and is scoped like any other
    row (a tenant can only see their own contract).
  - Compound uniqueness (e.g. `(tenantId, caseNumber)`) is a
    follow-up in Sprint 0.5.1 once the first non-LVJ tenant lands.
- **Follow-ups.**
  - Migrate the existing 24 API routes off `guard* + inline prisma`
    onto `runAuthed(...)` (Sprint 0.5.1). Until then A-003 runs as
    informational.
  - Supabase RLS policy file lands with the first `supabase db push`
    (post-infra connect, PRD Phase B).
  - Stripe Connect identifiers move from `TenantContract` to a
    richer `PlatformAccount` model in Sprint 15.

---

## D-024 · Supabase RLS uses USING + WITH CHECK; tenant id via `app.current_tenant()` set by `SET LOCAL`

- **Date.** 2026-04-23
- **Status.** accepted
- **Context.** Per D-023 the app layer is the primary tenant gate and
  Supabase RLS is defense-in-depth. Before the RLS layer lands we
  need the policy pattern nailed down so migrations don't have to be
  re-written later. Cross-repo review of `khaledaun/KhaledAun.com`
  surfaced a concrete anti-pattern in its `rls-policies.sql`: every
  policy uses only `USING`, with no `WITH CHECK`. That permits a
  caller to `UPDATE` a row *into* a value that escapes the policy's
  own filter, silently de-scoping data.
- **Decision.** For every RLS-enabled table in LVJ:
  1. `SELECT` / `DELETE` policies use `USING (tenant_id =
     app.current_tenant())`.
  2. `INSERT` / `UPDATE` policies use **both** `USING (tenant_id =
     app.current_tenant())` (filters target rows for UPDATE) **and**
     `WITH CHECK (tenant_id = app.current_tenant())` (rejects writes
     that would produce a cross-tenant row).
  3. `FOR ALL` policies (e.g. platform-admin bypass) also carry both
     clauses explicitly — never rely on the USING/WITH-CHECK default
     coupling.
  4. Tenant id propagates into Postgres via a stable function
     `app.current_tenant()` that reads a GUC set per request with
     `SET LOCAL app.tenant_id = '<id>'`. The app layer sets the GUC
     inside the same transaction as the query; connection-pool reuse
     is safe because `SET LOCAL` is transaction-scoped.
  5. The GUC is set from `TenantContext.tenantId` in `lib/tenants.ts`
     (same value the Prisma client extension already uses). A helper
     in `lib/db.ts` (added when Supabase connects) wraps every
     transaction in `SET LOCAL` before the first query.
- **Why not `auth.uid()` + JWT claims?** KhaledAun.com's pattern
  (`auth.jwt() ->> 'role'` with COALESCE across three JWT locations)
  works for role gating but does not map cleanly onto tenancy —
  NextAuth sessions don't round-trip to Supabase's `auth.jwt()`
  without adopting Supabase Auth end-to-end, which is a separate
  decision pending (see `SESSION_NOTES.md` open architectural
  questions). `SET LOCAL` works today from any Postgres client
  (Prisma, raw SQL, background jobs) and is agnostic to the session
  provider.
- **Consequences.**
  - The policy file (lands with first `supabase db push`) carries
    one `CREATE POLICY` per operation per table, not a single
    combined `FOR ALL` — so USING vs WITH CHECK stays explicit.
  - `app.current_tenant()` is `STABLE` and marked `SECURITY DEFINER`
    so the planner can use it in policy WHERE clauses without a
    per-row recompute.
  - `runPlatformOp` (D-023) sets a second GUC `app.platform_op = 1`
    that the policies honor via `OR`. Cross-tenant reads by LVJ_*
    staff remain possible, and every access still writes an
    `AuditLog` row because the app-layer guard runs first.
  - A future CI job `rls-audit` (scheduled with the first `supabase
    db push`) fails if a new policy is missing `WITH CHECK` on an
    `INSERT` / `UPDATE`.
- **Status of implementation.** Deferred until Supabase connects
  (EXECUTION_PLAN §12.2). This decision only binds the *pattern*, so
  the migration author doesn't re-discover the anti-pattern.
- **Follow-ups.**
  - Land `packages/db/sql/rls-policies.sql` (or equivalent location)
    on first Supabase connect.
  - Add `scripts/audit-rls.ts` to enforce USING + WITH CHECK on every
    writable policy.
  - Revisit if / when we migrate to Supabase Auth end-to-end (open
    question in `SESSION_NOTES.md`).

---

## D-025 · Supabase-connect contract: pooler/direct URL split, `@@map` discipline, `force-dynamic` on DB-reading routes, case-insensitive email

- **Date.** 2026-04-23
- **Status.** accepted
- **Context.** D-023 / D-024 bind the *tenancy* and *RLS* patterns
  for when Supabase connects. They don't bind the Prisma /
  Next.js / Supabase plumbing that sits around RLS, and each item
  below has been a real, costly foot-gun in a sibling project
  (KhaledAunSite digest, `docs/xrepo/khaledaunsite/02-known-
  pitfalls-and-fixes.md`). Capturing the contract now so the first
  `supabase db push` and the first production deploy don't
  re-discover them.
- **Decision.** On first Supabase connect, the following are
  binding, not advisory:
  1. **Two URLs, not one.** `DATABASE_URL` for Prisma runtime uses
     the Supabase pooler on port `6543` with
     `?pgbouncer=true&connection_limit=1`. `DIRECT_URL` uses the
     direct connection on port `5432` for migrations. Prisma schema
     declares both via `datasource db { url = env("DATABASE_URL");
     directUrl = env("DIRECT_URL") }`. `packages/env` equivalent
     validation (our `lib/env.ts` or successor) fails fast if
     either is missing.
  2. **Prisma singleton stays singleton.** `getPrisma()` in
     `lib/db.ts` is the only instantiation path. A CI lint rule
     lands post-Sprint-0.5.1 banning `new PrismaClient()` outside
     that file.
  3. **`@@map` discipline for raw queries.** Raw Supabase client
     calls (if any — RLS policies, admin scripts, future cron
     handlers that bypass Prisma) use the *table* name from
     `@@map`, not the Prisma *model* name. `Case` → `cases`,
     `ServiceType` → `service_types`, etc. A comment header on
     every raw-query file states this, and `scripts/audit-prisma.ts`
     (C-004 additive-only audit) grows a sub-check for
     `supabase.from('<PascalCase>')` patterns in the commit that
     lands the first raw query.
  4. **`force-dynamic` on every DB-reading route and page.** Any
     `app/api/*` route handler that imports `getPrisma` (or a
     `runAuthed` / `runPlatformOp` helper) declares
     `export const dynamic = 'force-dynamic'` and
     `export const revalidate = 0` at the top of the file. Same
     applies to any `page.tsx` that calls `getPrisma()` directly or
     via a Server Component fetch. Missing this is not a
     warning — it's an auth-bypass risk because static HTML is
     served to everyone regardless of middleware. A new audit
     **A-005 (dynamic-route audit)** lands in the same PR that
     connects Supabase, and is required (not informational) from
     day 1.
  5. **Case-insensitive email normalization.** Every path that
     reads or writes `User.email` lowercases first. NextAuth's
     email-providers do this by default — preserve it. If we ever
     migrate to Supabase Auth (open question in `SESSION_NOTES.md`),
     the migration script normalizes existing rows first.
- **Why a single decision, not five.** These five items share one
  trigger — the first `supabase db push` — and they're all so
  mechanical that debate per-item is waste. One D-NNN keeps the
  pre-connect checklist grep-able in one place.
- **Relation to D-024.** D-024 pins the *policy* shape (`USING` +
  `WITH CHECK`, `app.current_tenant()` via `SET LOCAL`). D-025 pins
  the *connection + route* shape that has to be correct before
  D-024's policies can do their job. They're complementary; neither
  supersedes the other.
- **Consequences.**
  - The Supabase-connect PR must land items (1)–(5) plus the
    policy file from D-024 before any tenant user is allowed in.
  - Post-Sprint-0.5.1 cleanup PR adds A-005 (dynamic-route audit)
    even before Supabase connects, so every new route lands with
    `force-dynamic` from the moment Prisma is imported. Today's
    routes are DB-backed and already run against `SKIP_DB=1`; the
    audit fires on a fresh Postgres.
  - The `scripts/preflight.sh` pattern from the KhaledAunSite
    digest lands as a separate follow-up (post-0.7) and is the
    single-command driver for (1)–(5) locally.
- **Status of implementation.** Deferred to Supabase-connect PR;
  this decision binds the pattern so the migration author doesn't
  re-discover it.
- **Follow-ups.**
  - `scripts/audit-dynamic.ts` (A-005) — next post-0.7 cleanup PR.
  - `scripts/audit-prisma.ts` — add `supabase.from('<PascalCase>')`
    check in the commit that lands the first raw Supabase query.
  - `scripts/preflight.sh` — follow-up PR post-Sprint-0.7.
  - `lib/env.ts` — add `DIRECT_URL` to the required-env schema when
    Supabase connects.

---

## How to add a decision

1. Grab the next `D-NNN` number.
2. Status is `proposed` until the user (or an approver) confirms, then
   `accepted`. When replaced, use `superseded-by: D-MMM`.
3. Keep it short. If a decision needs long rationale, link to a PR or
   a dedicated doc — don't inflate this file.
4. Commit the decision *with* the code that implements it. Decisions
   without code land in the same commit as the doc change that records
   them.
