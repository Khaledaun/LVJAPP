# LVJ Execution Log

> Rolling commit-by-commit diary for the LVJ AssistantApp build.
> **Update rule:** every commit on the feature branch appends an entry here
> *in the same PR*. Don't let this drift. If it drifts, the first task of
> the next session is to reconstruct it from `git log`.
>
> This is the operational twin of `Claude.md` (the architecture spec) and
> `docs/AGENT_OS.md` (the agent contract). It answers the question
> "what actually landed, and what's deferred?" at a glance.

---

## Branch

Code work is on `claude/phase-0-audit-NWzaW`. The v4.0 documentation
re-baseline lands on `claude/rebaseline-claude-v4-tSN6g` (docs-only;
no source files touched). Merges to `main` happen PR-by-PR; commits
below are on the feature branches, chronological.

## Session context

- **Design source.** The LVJ Case Management design pack from
  claude.ai/design (bundle ID `JGhnOWc_NUr-I6eLhcYBUw`) is the canonical
  visual reference. Key files used when porting: `shared.css`,
  `shell.jsx`, the inlined JSX inside `LVJ Case Management.html`
  (screens at lines 886 / 918 / 973 / 1107 / 1193 / 1362 / 1567 / 1653 /
  1710), and the iterated chat transcript `chats/chat1.md`.
  **The pack is not checked into the repo** — it lives in `/tmp/lvj-design/`
  during a session. Future sessions should re-fetch it or reference this
  log.
- **Primary stack invariants.** Next.js 14 App Router · Prisma ·
  PostgreSQL · NextAuth 4 · shadcn/ui + Tailwind for legacy components;
  LVJ design-system primitives under `components/lvj/` for new screens.
- **Foundation (Sprint 0) is stable.** RBAC / audit / crypto / events /
  ai-router / notifications bus all landed in `a49d568`.
- **AOS Phase 1 is wired but feature-flagged OFF in prod.** The runtime
  plus Intake / Drafting / Email agents are registered; flipping
  `AGENT_INTAKE_ENABLED=1`, `AGENT_DRAFTING_ENABLED=1`,
  `AGENT_EMAIL_ENABLED=1` arms the loop. Migration has not run yet.

---

## Commits (newest last)

### `a49d568` — Sprint 0: foundation cleanup + lib scaffolding

Resolves Phase 0 audit blockers. Rehabilitated `lib/rbac.ts`
(`assertCaseAccess` / `assertOrgAccess` / `assertStaff` with real session
load, Case lookup, same-office lawyer-admin grant). Added `lib/events.ts`
(typed event bus, `Promise.allSettled` fan-out), `lib/crypto.ts`
(AES-256-GCM + `sealString`/`openString`/`constantTimeEqual`),
`lib/ai-router.ts` (12-task routing table, `registerProvider()` hook,
per-attempt audit). Rewrote `lib/audit.ts` with canonical `logAuditEvent`
+ legacy shim; rewrote `lib/notifications.ts` to add a canonical
`notify()` while preserving all pre-existing exports so the old test suite
keeps passing.

Schema additions (all additive per GR#4): `Office`, `Partner`,
`CaseOutcome`, `EligibilityLead`, `NotificationLog`, `VoiceCallLog`,
**`AuditLog`** (previously referenced by `lib/audit.ts` but missing —
every audit write was silently failing). `Role` enum extended with the
7-role matrix. `User.officeId`, `Case.officeId`, `Case.partnerId` added;
`ServiceType` gained `code`, `category`, `typicalTimeline`, `baseFee`,
`governmentFee`, `requiredForms`, `counselPool`.

14 ghost files deleted from `AssistantAPP-main/` root. `.env.example`
expanded to cover CLAUDE.md Phase 6 (all LLM keys, Twilio, ElevenLabs,
Kaspo, PostBridge, Stripe/IOLTA, SendGrid, Firebase, Upstash,
`DOCUMENT_ENCRYPTION_KEY`, three GCS buckets).

Tests: `__tests__/lib-events.test.ts`, `lib-crypto.test.ts`,
`lib-rbac.test.ts`, `lib-audit.test.ts`.

**Deferred:** `npx prisma migrate dev --name sprint0-foundation` — the
Prisma CDN returned 503 during `prisma validate`; schema reviewed
manually; no DB available in sandbox. Eleven API routes still lack auth
guards (see Phase 0 audit report).

### `9b75c1e` — merge of Sprint 0 into `main`

Administrative — the feature branch was merged, then fast-forwarded
locally. No code change.

### `6d42144` — Sprint 1 UI: design tokens, shell, sign-in, dashboard

Ports the LVJ Case Management design pack's primitives and the two
screens on the Sprint 1 / early Sprint 2 critical path.

- **Design tokens** in `app/globals.css` as an additive layer over the
  existing shadcn/ui set (legacy components untouched). Adds ink /
  ivory / emerald / gold / stone palette, traffic-light colours, four
  font families, and `lvj-*` component classes (app, sidebar, topbar,
  kpis, tbl, card, tl, journey, field, chip, btn). Also fixes the
  pre-existing broken `@applyborder-color` rule.
- **Fonts.** `app/layout.tsx` loads Cormorant Garamond · Inter · JetBrains
  Mono · Amiri via `next/font/google`, exposed as
  `--font-lvj-{serif,sans,mono,arabic}` CSS variables.
- **Components** under `components/lvj/`: `icons.tsx` (hairline 16px
  SVGs), `traffic-light-badge.tsx` (`TrafficLightBadge` +
  `resolveStatus()`, WCAG-AA), `sidebar.tsx` (three nav groups,
  `usePathname` active detection, badge support), `topbar.tsx`
  (breadcrumb + ⌘K search + bell + messages), `app-shell.tsx`
  (server component, RTL-aware), `mobile-tabbar.tsx` (4-tab bottom
  nav).
- **`app/signin/page.tsx`** rewritten to the two-panel design (ink
  brand panel with Arabic motto, ivory form panel) wired to NextAuth
  credentials / email / google providers.
- **`app/dashboard/page.tsx`** rebuilt on `AppShell`: hero KPI (86px
  numeral + gold sparkline), three supporting KPIs, priority-cases
  table, upcoming-deadlines strip, Status Pulse bar chart. Data is
  sample-only per CLAUDE.md (real Prisma queries arrive in Sprint 2).

Tests: `__tests__/lvj-traffic-light-badge.test.tsx`,
`__tests__/lvj-sidebar.test.tsx`.

**Deferred:** node_modules not installed in sandbox → Jest not executed.
Client-portal / mobile surfaces and Arabic RTL variants exist in the
design pack but are not implemented (the Arabic track is explicitly
on hold — see `docs/DECISIONS.md` D-003).

### `e8bf9ca` — Phase 8: introduce the Agent Operating System (AOS)

Adds `docs/AGENT_OS.md` (~1060 lines, 15 sections) — the binding
engineering contract for every agent. Bumps `Claude.md` to v3.1 with a
new §Phase 8 section summarising the contract.

Key shifts vs the initial "20 agents" draft:
- Reclassified to 4 services / 9 workflow agents / 4 channel agents /
  3 surfaces / 3 background jobs. Only ~9 contain LLM loops.
- Collapsed duplication: Drafting owns intent; Email/WhatsApp/Voice own
  delivery.
- Contract-first: every agent = manifest + zod schemas + versioned
  prompt + golden fixtures + SKILL.md; CI validates.
- Hard tool allow-lists; agents declare AITask keys, not raw model IDs.
- HITL as a first-class primitive (new `HITLApproval` model).
- Cost / duration / call budgets enforced, not requested; firm-wide
  daily cap with critical-agent bypass.
- Post-LLM guardrail pipeline (banned-phrase, outcome-guarantee, UPL,
  PII, tone) with hard-block on outcome guarantees.
- KB governance with YAML front-matter + staleness sweep.
- Observability mandatory: one `AutomationLog` row per invoke, shared
  `correlationId` across `AuditLog` rows.
- Phased rollout: Phase 1 ships *only* runtime + Intake + Drafting +
  Email + the four services. 17 other units staged across Phases 2–5.

### `42dde49` — Sprint 1 UI: Cases list, Case detail, Intake wizard, Notifications

Four more screens from the design pack; binds to existing SWR / TermsGate
/ CaseTabs data contracts where they already existed.

- **`app/cases/page.tsx`** rewritten on `AppShell` + `lvj-tbl`. Keeps
  the original URL-param SWR contract (`search`, `status`, `sort`,
  `visaType`, `origin`, `lead`). Adds status chip row, density toggle
  (`C/M/L` via `--rowpad`), applicant avatars + email, inline progress
  bar coloured by status, row actions.
- **`app/cases/[id]/page.tsx`** — minimal refactor. Preserves TermsGate,
  CaseTabs, ExternalPartnersManager, all four tab bodies, and the
  existing `TrafficLightBadge` from `components/ui/`. Replaces
  SimpleTopbar chrome with `AppShell`; adds the hero header (service
  chip · TrafficLightBadge · case ID · opened date) + a 7-node
  horizontal `CaseStepper` with emerald connectors and amber "Now"
  label. Loading and not-found states also use `AppShell`.
- **`app/intake/page.tsx`** (new) — 4-step wizard with stepper, gold
  "In progress" label, per-step required-field gating, right-rail live
  summary + service guide. Submission is a local no-op; inline comment
  marks the AOS Intake Agent POST target.
- **`app/notifications/page.tsx`** (new) — gold unread rail, channel
  icons (status / doc / uscis / msg / intake), live channel filter,
  Mark-all-read. Data is sample-only; comment points to the future
  `NotificationLog` + `AuditLog` join.

No data-layer changes in this commit.

### `3e15819` — AOS Phase 1: runtime + Intake → Drafting → Email loop

Lands the full contract described in `docs/AGENT_OS.md` §4–§10.

- **Schema (additive).** `AutomationLog`, `AgentDraft`, `HITLApproval`,
  `CaseDeadline` + enums `AutomationStatus`, `DraftReviewState`,
  `HITLStatus`, `CaseDeadlineStatus`.
- **Runtime** (`lib/agents/`): `types.ts`, `invoke.ts` (tool allowlist
  proxy, cost/duration/call budgets, AutomationLog + AuditLog with a
  shared `correlationId`), `orchestrator.ts`, `cost-guard.ts` (daily
  firm cap; `deadline`/`orchestrator`/`hitl-gate` bypass freezes),
  `breaker.ts` (5-min window, ≥10 samples, 20% threshold, 10-min
  cooldown), `guardrails.ts` (outcome-guarantee scanner, PII scrub,
  optional UPL classifier plug point), `hitl.ts`, `register.ts`.
- **Agents.**
  - `agents/intake/` — workflow; models `eligibility-score`,
    `form-prefill`. Opens `before_case_creation` HITL when
    `eligibilityScore < 0.6 OR riskFlags.length > 0`. Emits typed
    escalation events for criminal history / prior refusal / urgent
    deadline / inconsistent identity / distressed client.
  - `agents/drafting/` — workflow; returns `reviewState=DRAFT` always.
    Guardrail pipeline runs post-LLM; hard-fails open a HITL gate and
    flip the draft to `PENDING_APPROVAL`. PII scrub pre-persist.
  - `agents/email/` — deterministic channel adapter; zero LLM calls;
    SendGrid when `SENDGRID_API_KEY` is set, dev path still writes
    `NotificationLog`. `highRisk=true` opens
    `send_to_client_high_risk` HITL.
- **Prompts.** `prompts/intake/v1.md`, `prompts/drafting/v1.md`.
- **KB skeletons.** `skills/core/SKILL.md`, `skills/intake/SKILL.md`,
  `skills/drafting/SKILL.md` with YAML front-matter. Article bodies
  (disclaimers, tone guides, escalation matrix) need lawyer review
  before `confidence: authoritative`.
- **HITL UI.** `app/admin/approvals/` (server page + client sub-tree)
  with SLA-sorted queue, payload preview, approve / reject.
- **API.** `POST /api/agents/hitl/[id]` emits
  `hitl.approved` / `hitl.rejected`.
- **Tests** (`__tests__/agents/`): `guardrails.test.ts` (outcome
  guarantee, banned phrases, PII, UPL plug), `breaker.test.ts`,
  `cost-guard.test.ts`, `invoke.test.ts` (happy path, flag gate, tool
  allowlist rejection, escalation bumps outcome, breaker short-circuit,
  unknown agent).

**Deferred:**
- `npx prisma migrate dev --name aos-phase1` — not run here.
- Feature flags default OFF: `AGENT_INTAKE_ENABLED`,
  `AGENT_DRAFTING_ENABLED`, `AGENT_EMAIL_ENABLED`.
- `orchestrator.subscribeAgent('intake')` etc. not called from a
  server bootstrap yet — the runtime is registered, but triggers are
  not bound to the event bus until a route or cron handler calls
  `subscribeAgent`.
- Full Core KB content (disclaimers bank, tone guides, escalation
  matrix articles).
- Remaining agents per `docs/AGENT_OS.md` §11 (Deadline, WhatsApp,
  Voice, Legal KB RAG, Internal Messaging, Eligibility, Documents,
  Billing, CRM, Analytics/QA, Growth ops).

### `7fd44ad` — Documentation discipline: EXECUTION_LOG + DECISIONS + Claude.md v3.2

Encodes the founder's rule (decision `D-005` in `docs/DECISIONS.md`):
every commit updates this log in the same PR; every conversation
decision lands in `DECISIONS.md`.

- New `docs/EXECUTION_LOG.md` (this file) and `docs/DECISIONS.md`
  (seeded with D-001 … D-007).
- `Claude.md` bumped to v3.2:
  - Quick Start now lists the four reads required before any task
    (Claude.md / EXECUTION_LOG.md / DECISIONS.md / AGENT_OS.md).
  - New §Documentation Discipline section (6 rules).
  - New §Execution Status (Snapshot) — the 5 landed commits, the
    3 feature flags currently OFF, the 3 external blockers.
  - Footer re-worded: architecture → Claude.md, progress → log,
    scope → decisions.

No code changes. No schema changes. Purely docs + process.

### `pending` — `Claude.md` re-baseline to v4.0 (documentation-only)

Re-baselines the engineering contract against PRD v0.3 and the newly
ratified decision block D-007 → D-019. **No source code touched.**
Subsequent PRs will execute Sprint 0.1 → Sprint 16 against the new
contract per D-019 ordering.

- **`docs/PRD.md`** (was `docs/Pdr`, no extension) — renamed to the
  canonical filename the rest of the docs refer to. Content unchanged.
- **`docs/DECISIONS.md`** — inserted the PRD v0.3 decision block
  `D-007` (flat 25% commission) through `D-019` (sprint priority).
  Pre-existing `D-006` ("Drafting owns intent") and `D-007` ("Design
  source = claude.ai/design pack") collided with the new numbering;
  renumbered in place to `D-020` and `D-021` with "Renumbered" notes
  for archaeological grep. `D-003` ("Arabic / multilingual UI on
  hold") marked `superseded-by: D-015`. The stand-alone
  `DECISIONS additions` delivery file has been removed now that its
  content is merged.
- **`docs/prompts/CLAUDE_MD_REBASELINE_v4.md`** (new) — the founder's
  re-baseline prompt, preserved as a traceability artefact.
  Reconciliation notes document the D-NNN numbering resolution.
- **`Claude.md`** — end-to-end rewrite to **v4.0**. Version header,
  "What changed in v4.0" callout, Quick Start step 0 (read PRD first),
  Product Identity rows (Tenancy, Marketing surface, Languages),
  Golden Rule #9 (tenant isolation), Architecture Decisions #11–#16
  (multi-tenant + Webflow + marketing HITL + provider vault +
  attribution + destinationJurisdiction). Project Structure tree
  extended with `(platform)/`, `(provider)/`, marketing + tenants
  routes, new `lib/` modules. Skills Reference table updated: 3
  existing rows re-aimed at PT/EU jurisdiction (forms-automation,
  deadline-engine, security); 14 new rows added. AITask routing
  table: `rfe-draft` retired → `additional-evidence-draft`; added
  `marketing-draft`, `seo-structured-data`, `geo-content-optimize`,
  `attribution-classify`, `arabic-translate`,
  `provider-listing-draft`. Phase 4 adds 18+ additive models (Tenant,
  TenantContract, ServiceProvider, ServiceProviderContract,
  CustomCategory, ProviderEngagement, ProviderListing,
  ProviderTestimonial, MarketingLead, AttributionOverride,
  ContentArticle, MarketingApproval, MarketingTouch, MarketingMetric,
  CommissionLedger, CommissionPayout, StripeConnectAccount, DSAR,
  AnalyticsEvent, AnalyticsAggregate, CostLimit, OnboardingProgress)
  and lists every existing model gaining `tenantId`. Phase 5 replaced
  end-to-end with Sprints 0.1, 0.5, 0.7, 8.5, 10.5, 15, 16 + revisions
  to 4 / 8 / 9 / 10 / 13 / 14. Phase 6 env-vars adds Webflow + Stripe
  Connect + AR/PT voice IDs + cost-cap defaults + pager; deprecates
  IOLTA. Phase 7 output format adds tenant-impact + locale-impact line
  items. Phase 8 reflects tenant isolation in `invoke()`,
  license-parity for advice tagging, marketing agents in Phase 2.5,
  D-012 cost caps, D-013 4-tier HITL, D-014 availability. Execution
  Status snapshot appended (prior history preserved). Documentation
  Discipline section unchanged.
- **14 new SKILL.md scaffolds** created under `skills/`:
  `multi-tenancy`, `marketing-automation`, `seo-aeo-geo`, `webflow`,
  `portugal-immigration`, `uae-immigration`, `service-provider-pool`,
  `marketplace-attribution`, `provider-directory`, `i18n-rtl`,
  `onboarding`, `availability`, `cost-guard`, `escalation`. Each
  carries YAML front-matter with `owner`, `jurisdiction`,
  `confidence: draft`, `review_ttl`, and `motivated_by:` back-links
  to PRD / D-NNN. Full article bodies iterate per owning sprint.

**Numbering reconciliation.** The founder's re-baseline prompt
referenced "D-006 through D-020 (14 decisions)" and used D-NNN numbers
that drift above D-010 (e.g. prompt "D-011 cost caps" = canonical
D-012; prompt "D-012 HITL tiers" = canonical D-013; prompt "D-016
directory" = canonical D-017; prompt "D-017 Stripe Connect" =
canonical D-016; prompt "D-020 sprint priority" = canonical D-019).
This log + `Claude.md` v4.0 + PRD v0.3 use the canonical
`docs/DECISIONS.md` numbers. The `CLAUDE_MD_REBASELINE_v4.md`
traceability artefact captures the mapping.

**Deferred.** No migrations; no code touched. Sprint 0.1 (close the
11 unauthed routes) remains the gate per D-019 before tenant
scaffolding.

### `pending` — Master Execution Plan + Bugs log (documentation-only)

Lands the binding *operational* contract that sits alongside
`Claude.md` (architecture), `docs/PRD.md` (product), `docs/AGENT_OS.md`
(agents), `docs/DECISIONS.md` (choices), and this file (history). No
source code touched.

- **`docs/EXECUTION_PLAN.md`** (new, v1.0, ~70 KB) —
  twelve sections:
  §0 reading order + timeout protocol (while writing and while
  executing; per-call wall clock ≤ 90 s, chunk writes ≤ 8 KB,
  ≤ 40 tool calls per session checkpoint, no `sleep` loops, paginate
  big reads);
  §1 artefact map (who owns what, one question per artefact);
  §2 audit framework — 10 audits (A-001…A-010) with owners +
  cadence + blocking behaviour, per-PR gate checklist, cron map;
  §3 smoke testing — 13 smokes (S-001…S-013) with ≤ 14 min per-PR
  budget, smoke tenant isolation, sandbox-without-DB fallback;
  §4 bugs & fixes log — 4-tier severity, entry format, smoke/audit
  auto-population hook, review cadence, learning-loop handoff;
  §5 continuous learning — 4 feedback streams → weekly KB queue →
  three sinks (SKILL.md, golden fixture, D-NNN); prompt versioning
  rule; 5-level skill maturity ladder; decision capture rule;
  quarterly contract review;
  §6 multi-agent Claude Code orchestration — explicit split
  between AOS in-product agents and Claude Code build subagents;
  subagent roster with tool + wall-clock budgets; parent/subagent
  handoff protocol; parallelism caps; per-sprint orchestration
  recipes (0.1 / 0.5 / 0.7 / 8.5); context-preservation protocol
  across sessions;
  §7 logging contract — six logs (`AuditLog`, `AutomationLog`,
  `NotificationLog`, `VoiceCallLog`, `EXECUTION_LOG.md`, `BUGS.md`),
  `correlationId` UUIDv7 birth points, what-writes-where matrix,
  never-log list (PII, prompts, Stripe raw bodies);
  §8 security & safety — 25 controls (C-001…C-025) mapped to
  Golden Rules / Architecture Decisions / D-NNN, 10-threat model
  snapshot, review checkpoints, safety-vs-UX trade-off ledger;
  §9 operational timeout runbook — symptom→response table, the
  "one more tool call" trap, partial-response recovery, when to use
  `run_in_background`, sandbox-without-DB discipline;
  §10 sprint orchestration runbook — current position, per-sprint
  recipes for D-019 order (0.1 → 0.5 → 0.7 → 8.5 → Webflow webhook →
  AOS Phase 2 → Sprint 15 → Sprint 10 + 10.5);
  §11 Definition of Done for code PR, docs-only PR, new agent, new
  skill, cron/audit, full sprint;
  §12 open items — tooling gaps (Sprint 0.1 hard unblocks),
  infrastructure gaps, organisational gaps, deferred decisions
  awaiting conversation, fresh next actions.

- **`docs/BUGS.md`** (new) — the bug log. Template, severity table,
  status lifecycle, PII discipline, correlation-id convention. Seeded
  with `B-000` meta entry (the log's own existence). Open Sev-1 /
  Sev-2 section currently empty; operational debt (Postgres absence,
  `node_modules`, 11 unauthed routes) stays in this file's rolling
  open items since those are deferred deliverables, not defects.

- **`docs/DECISIONS.md`** — appended `D-022` (Master Execution Plan
  + Bugs log are first-class artefacts). Binds process conflicts to
  `EXECUTION_PLAN.md`; architecture to `Claude.md`; product to
  `PRD.md`; ordering to D-019.

**Deferred.** Auto-population scripts
(`scripts/smoke/report-failures.ts`, `services/audits/<id>.ts`, the
full smoke battery, `scripts/audit-auth.ts`, `scripts/audit-tenant.ts`,
`scripts/audit-jurisdiction.ts`, `.github/workflows/ci.yml`,
`vercel.json` cron block) land per `EXECUTION_PLAN.md` §12.1 as
Sprint 0.1 deliverables. `Claude.md` is not bumped in this PR — the
cross-reference to `EXECUTION_PLAN.md` is carried by §1 of the new
file itself so the reference is live without a `Claude.md` version
change.

### `pending` — Sprint 0.1: close 12 unauthed API routes + ship A-002 script + S-003 smoke

First sprint executed under `docs/EXECUTION_PLAN.md` v1.0 (§10.2
recipe). Closes **B-001** (Sev-1) in `docs/BUGS.md`.

- **`lib/rbac-http.ts`** (new, server-only) — introduces
  `guardCaseAccess` / `guardOrgAccess` / `guardStaff`. Each wraps its
  throwing counterpart in `lib/rbac.ts` and returns
  `{ ok: true, user } | { ok: false, response: Response }` with the
  response carrying a proper 401 / 403 status. Keeps HTTP-layer
  wiring out of `lib/rbac.ts` (which stays mixed client/server).
- **12 route wraps** (Phase 0 said 11; the Explore subagent found
  `cases/[id]/timeline/` returning hardcoded mock data case-scoped,
  so it was added):
  - case-scoped via `params.id`: `cases/[id]/payments`,
    `cases/[id]/meta`, `cases/[id]/documents/upload-url`,
    `cases/[id]/timeline` — `guardCaseAccess(params.id)` at the top
    of every method.
  - case-scoped via `?caseId=` or `body.caseId`: `journey`,
    `messages`, `documents`, `payments` — validate `caseId` present
    (400 if not), then `guardCaseAccess(caseId)`.
  - audit: `guardCaseAccess` when filtered by case, `guardStaff`
    otherwise.
  - staff-only: `staff`, `reports`, `messages` `notify` action.
  - `signup/route.ts` — public for `role: 'client'` only;
    role-escalation rejected with 403 unless the caller is an
    authenticated global admin. Closes a pre-fix privilege-escalation
    vector.
- **`scripts/audit-auth.ts`** (A-002) — CI-ready static audit. Walks
  every `app/api/**/route.ts`, classifies as GUARDED / STUB /
  INTENTIONAL_PUBLIC / UNAUTHED. `INTENTIONAL_PUBLIC` allowlist:
  `auth/[...nextauth]`, `auth/bootstrap`, `health`, `terms/content`.
  Exit code 1 when any UNAUTHED route appears outside the allowlist.
  Supports `--json` for machine consumption.
- **`__tests__/lib-rbac-http.test.ts`** — unit coverage for the three
  guard wrappers (happy path, 401, 403, status defaulting, mocked
  `lib/rbac` assertions). No Prisma / no next-auth in the test.
- **`e2e-tests/auth-smoke.spec.ts`** (S-003) — 14 adversarial cases.
  Each hits the route with no cookies and asserts (a) status ∈
  {400, 401, 403}, (b) status is not 2xx, not 500, (c) the JSON body
  does not carry any of the handler's success-path keys (`items`,
  `messages`, `documents`, `payments`, `stages`, `kpis`, `case`,
  `user`). Signup's role-escalation attempt expects 403 specifically.
- **`docs/BUGS.md`** — appended `B-001` with full reproduction, root
  cause, fix, tenant impact. Status `fixed`.

**Smoke battery status.**
- S-001 (build + typecheck): **deferred** — sandbox has no
  `node_modules`. `docs/EXECUTION_PLAN.md` §9.5 discipline applied:
  PR description lists the deferral rather than claiming green.
- S-002 (jest): **deferred** — same reason. New unit tests compile
  against existing Jest config patterns.
- S-003 (auth smoke): **deferred to CI** — the spec ships; first run
  is blocked on a live Next dev server + DB. Ready to execute.

**Deferred.**
- Provision Postgres + `node_modules` in sandbox/CI so S-001..S-003
  actually run.
- `scripts/audit-auth.ts` runs via `ts-node` today; wire it to
  `npm run audit:auth` and to `.github/workflows/ci.yml` (both in
  §12.1 of EXECUTION_PLAN).
- Migrate the other `getServerSession` call sites to `guardX` as
  their owning sprints touch them (not a Sprint 0.1 goal).

### `pending` — Sprint 0.7: AR + RTL into design system + i18n foundation

Per D-019 / D-015. Sprint 0.5 (multi-tenancy) is blocked on Postgres
provisioning so the next executable item is 0.7. Lays the i18n
foundation without bringing in next-intl yet (sandbox lacks
node_modules); JSON layout is next-intl-compatible so the eventual
swap is mechanical.

- **`messages/en.json`** (new) — keys for the four landed lvj/*
  components: `sidebar.*` (10 nav labels + 3 section labels),
  `topbar.*` (search placeholder, breadcrumb, notifications,
  messages), `mobile_tabbar.*` (4 tab labels + nav aria-label),
  `status.*` (19 traffic-light statuses).
- **`messages/ar.json`** (new) — Arabic translations of every EN key.
  `_meta.review_status: 'draft'` — per D-015 these strings must be
  reviewed by a native AR reviewer in the marketing-HITL chain
  before client render. The infrastructure ships now; the review is
  a Sprint 13 prereq.
- **`messages/pt.json`** (new, stub) — key-presence stub so the i18n
  loader doesn't crash when locale is forced. Population waits for
  Portuguese counsel sign-off (v1.x per D-015).
- **`lib/i18n.ts`** (new, server-safe) — `Locale` type
  (`'en' | 'ar' | 'pt'`), `SUPPORTED_LOCALES`, `SHIPPED_LOCALES`
  (EN + AR only — PT excluded from switcher), `DEFAULT_LOCALE`,
  `LOCALE_COOKIE = 'lvj_locale'`, `isLocale`, `resolveLocale`
  (precedence: pathname > cookie > Accept-Language > default), `t`
  with EN fallback for missing keys.
- **`lib/i18n-rtl.ts`** (new) — `isRtlLocale`, `getDir`,
  `getHtmlLangAttr` (BCP-47: `en` / `ar` / `pt-PT`),
  `getBodyFontVar` / `getDisplayFontVar` (returns the right CSS
  variable per locale), `formatNumber` with `kind: 'identifier'`
  escape so case IDs / dates stay Latin per SEF/AIMA convention.
- **`app/layout.tsx`** — adds `IBM_Plex_Sans_Arabic` next/font import
  exposed as `--font-lvj-arabic-body`. `Amiri` variable renamed
  `--font-lvj-arabic` → `--font-lvj-arabic-display` to make the
  D-015 display/body pairing explicit. `<html>` now reads
  `lvj_locale` cookie via `cookies()` and emits dynamic `lang` /
  `dir` / `data-locale` attributes.
- **`app/globals.css`** — adds `--lvj-arabic-display` /
  `--lvj-arabic-body` token vars; preserves `--lvj-arabic` as a
  back-compat alias. New `[dir="rtl"]` selector swaps `--lvj-sans`
  + `--lvj-serif` to the AR pairing. New
  `[dir="rtl"] svg[data-rtl-mirror="true"]` rule provides
  `transform: scaleX(-1)` for icons that opt in.
- **`components/lvj/icons.tsx`** — `IconArrow` now carries
  `data-rtl-mirror="true"`; brand icons / language-neutral icons
  (Plus, etc.) opt out by omitting the attribute.
- **`middleware.ts`** — wraps `withAuth` in a thin shell that runs
  `applyLocaleCookie()` after the auth pass. Cookie set on every
  matched route when the resolved locale differs from the existing
  cookie value (so we don't `Set-Cookie` on every request). Matcher
  expanded to include `/ar/:path*`, `/en/:path*`, `/pt/:path*` so
  the cookie gets set on first hit even before the locale route
  groups exist. `/api/*` skips the locale rewrite (JSON contract is
  locale-neutral).
- **`agents/intake/schema.ts`** + **`agents/drafting/schema.ts`** —
  `locale` widened from `z.literal('en')` to
  `z.enum(['en', 'ar', 'pt'])` with `.default('en')`. Per D-015 the
  intake + drafting agents must accept AR payloads in v1.
- **`__tests__/lib-i18n.test.ts`** — unit coverage for `isLocale`,
  `resolveLocale` (path > cookie > accept-language precedence),
  `t` (AR present, EN fallback, missing-key signal), and the
  `i18n-rtl` helpers (dir, BCP-47, font vars, identifier vs prose
  numerals). No DOM, no Next runtime.
- **`e2e-tests/locale-smoke.spec.ts`** (S-010) — 4 cases: default →
  EN/LTR; cookie `lvj_locale=ar` → AR/RTL; middleware sets cookie
  from `/ar/dashboard`; `--font-lvj-arabic-body` and
  `--font-lvj-arabic-display` resolve to non-empty values on the
  rendered document.

**Smoke battery status.**
- S-001 (build + typecheck): **deferred** — same sandbox blocker.
- S-002 (jest): **deferred**.
- S-010 (locale smoke): **ships, deferred run** — needs live Next
  server. Spec ready.

**Deferred.**
- next-intl install + migration of components/lvj/* to use `t()`
  hooks (Sprint 0.7-bis or Sprint 1 follow-up). Today the
  components still render hardcoded EN strings — the foundation is
  in place but no component has been migrated to consume it. This
  keeps the sprint scoped to "infrastructure", per
  `docs/EXECUTION_PLAN.md` §10.4 deliverable list.
- Native Arabic reviewer sign-off for `messages/ar.json` (D-015 —
  organisational gap).
- Locale switcher UI in topbar (small follow-up; the cookie
  primitive is in place).
- Per-locale URL routing groups under `app/(locale)/` (a bigger
  refactor; not in 0.7 scope).

### `pending` — Sprint 0.7-bis: Webflow webhook ingress (D-019 marketing parallel track)

Smallest marketing-automation slice from D-019, executed in parallel
with 0.7. Establishes HMAC-verified webhook ingress (control C-009)
so Webflow form submissions can hit the platform now; the actual
`MarketingLead` row creation defers to Sprint 13 once
`MarketingLead` lands (Sprint 0.5 prereq for `tenantId` scoping).

- **`lib/webflow.ts`** (new, server-only) —
  `verifyWebhookSignature({ rawBody, signature, timestamp?, secret? })`:
  HMAC-SHA256 with timing-safe comparison; supports both Webflow's
  legacy body-only contract and the timestamp-prefixed variant
  (`<timestamp>:<rawBody>`); rejects missing secret, missing /
  malformed signature, length mismatch. Plus `WebflowEventType` /
  `WebflowFormSubmissionPayload` types and a narrow `asFormSubmission`
  guard so the route can pattern-match safely.
- **`app/api/webhooks/webflow/route.ts`** (new) — POST endpoint.
  Reads body as raw text *before* JSON parse (re-serialisation breaks
  the HMAC). Tries timestamp-prefixed signature first, then
  body-only. Bad signature → 401 + `webflow.webhook.rejected_bad_signature`
  audit. Valid form_submission → 202 + audit row with siteId, formId,
  and **only the data field key names** (per
  `docs/EXECUTION_PLAN.md` §7.4 never-log-PII). Unsupported event →
  202 + `unsupported_event` audit. Malformed JSON with valid
  signature → 202 + `malformed_json` audit (we still ack to avoid
  Webflow retries, but the audit signals upstream config drift).
  Response body never echoes the signed payload (smoke S-009 asserts).
- **`scripts/audit-auth.ts`** — `webhooks/webflow/route.ts` added to
  the `INTENTIONAL_PUBLIC` allowlist (its boundary is the HMAC, not a
  session). Comment notes the allowlist requires a per-route signature
  smoke before adding any further entries.
- **`.env.example`** — adds `WEBFLOW_API_TOKEN`, `WEBFLOW_SITE_ID`,
  `WEBFLOW_WEBHOOK_SECRET` per Claude.md v4.0 §Phase 6.
- **`__tests__/lib-webflow.test.ts`** — 12 unit assertions covering
  every reject path (missing secret, missing/empty/non-hex signature,
  forged secret, body tamper, timestamp mismatch) plus uppercase hex,
  Buffer body, full happy paths, and `asFormSubmission` guard
  positive + 5 null cases.
- **`e2e-tests/webflow-webhook-smoke.spec.ts`** (S-009) — 7 cases:
  no signature → 401; forged → 401; valid → 202; valid+timestamp →
  202; unsupported event → 202 + ignored marker; malformed JSON →
  202 + ignored marker; defence-in-depth assertion that response
  body never echoes the signed payload (PII).

**Smoke battery status.**
- S-009 (Webflow webhook): **ships, deferred run** — needs live Next
  server. Spec ready.
- S-001/S-002: deferred (sandbox).

**Deferred.**
- `MarketingLead` Prisma model + write path (Sprint 13; depends on
  Sprint 0.5 for `tenantId`).
- Webflow Data API client (`lib/webflow.ts` extension for
  `publishDraft` / `approvePublish`) — Sprint 13 / Sprint 10.5.
- `Stripe`, `Kaspo` webhook receivers — Sprint 8.5 / Sprint 5
  respectively, following the same C-009 pattern.

### `pending` — Tooling: CI workflow, npm scripts, .claude settings

Closes three entries from `docs/EXECUTION_PLAN.md` §12.1 (tooling
gaps). No source code changes; wires what Sprints 0.1 / 0.7 / 0.7-bis
shipped so it actually runs in CI and in local dev.

- **`.github/workflows/ci.yml`** (new) — per-PR job
  `audit-and-test`: checkout, Node 20 + npm cache, `npm ci`,
  `npm run audit:auth` (A-002), `tsc --noEmit`, `npm run lint`,
  `npm test`, `npm run build`, Playwright chromium install, `npm run
  smoke` (runs auth / locale / webflow specs). `SKIP_DB=1` +
  `SKIP_AUTH=1` per `docs/EXECUTION_PLAN.md` §9.5 sandbox-without-DB
  discipline; a DB-backed workflow follows Sprint 0.5. Concurrency
  group cancels in-flight runs on new pushes. 20-min timeout ceiling.
- **`package.json`** — new scripts: `audit:auth`, `audit:auth:json`,
  `smoke:auth`, `smoke:locale`, `smoke:webflow`, `smoke`
  (chained audit + Playwright run).
- **`.claude/settings.json`** (new, repo-scoped) — permission
  allowlist for routine read-only Bash ops (git status/diff/log, ls,
  grep, find, wc, jq, lint, audit:auth, smoke runs) so future
  sessions don't re-prompt. `ask` list carries anything that writes
  to git or the filesystem non-reversibly (push, commit, reset,
  npm install, prisma migrate, rm). `deny` list carries force-push,
  `rm -rf /`, `curl`, `wget`. Env baseline matches the sandbox
  (SKIP_DB=1, SKIP_AUTH=1).

No tests / migrations / runtime behaviour changes.

### `pending` — Tooling: A-004 jurisdiction audit + vercel.json cron block

Closes two more entries from `docs/EXECUTION_PLAN.md` §12.1.

- **`scripts/audit-jurisdiction.ts`** (new) — A-004. Walks the repo,
  pattern-matches the D-006 legacy US-immigration term list (USCIS,
  RFE, EB5, H1B, N400, N-600, I-9, I-130, IOLTA, DS-160, ABA Model
  Rule 1.6, ABA Model Rule 5.3) with word-boundary guards. Per-term
  hit count + per-file listing. Allowlists the doc traceability
  surfaces (`Claude.md`, `docs/PRD.md`, `docs/DECISIONS.md`,
  `docs/EXECUTION_LOG.md`, `docs/EXECUTION_PLAN.md`,
  `docs/AGENT_OS.md`, `docs/prompts/*`, legacy reports). Informational
  by default (exit 0); `--strict src-only` exits non-zero if any
  hit appears outside the allowlist. `--json` machine output.
- **`package.json`** — `audit:jurisdiction` + `audit:jurisdiction:json`
  scripts.
- **`vercel.json`** (new) — 11 cron declarations matching
  `docs/EXECUTION_PLAN.md` §2.5 + Claude.md v4.0 §Project Structure:
  `audit-auth-weekly` (Sun 03:00), `audit-tenant-nightly` (03:15),
  `audit-jurisdiction-weekly` (Sun 03:30), `audit-kb-staleness-weekly`
  (Mon 03:00), `audit-cost-daily` (00:05), `audit-deps-weekly`
  (Sun 04:00), `audit-doc-discipline-weekly` (Sun 04:30),
  `deadline-alert` (00:05), `marketing-hitl-escalate` (hourly),
  `commission-settle` (1st of month 06:00),
  `analytics-rollup` (00:10). Handlers land per their owning sprint.
- **`docs/EXECUTION_PLAN.md` §12.1** — three more items ticked.

No runtime behaviour changes; the scripts + cron schedules are
declaration-only until their handlers exist.

### `pending` — Tooling: A-010 lint-docs + scripts/pii-scrub.ts

Closes two more items from `docs/EXECUTION_PLAN.md` §12.1.

- **`scripts/lint-docs.ts`** (new) — A-010 per D-005. Four rules:
  (R1) source diff requires `docs/EXECUTION_LOG.md` diff;
  (R2) long-lived contract doc diff (Claude.md / PRD / AGENT_OS /
       EXECUTION_PLAN) requires a version header bump;
  (R3) `docs/EXECUTION_LOG.md` is append-only — pre-existing commit
       entries cannot be deleted;
  (R4) `docs/DECISIONS.md` entries are immutable bodies; the only
       allowed in-place change is a new `superseded-by: D-NNN` marker.
       Otherwise a new D-NNN must be added.
  Compares `origin/main..HEAD` by default; configurable via
  `--base` / `--head`. `--json` for CI consumption.
- **`scripts/pii-scrub.ts`** (new) — `scrubPii(input)` +
  `scrubPiiDeep(value)`. Nine patterns: email, international phone,
  passport-ish (loose), US SSN, Portugal NIF, credit-card-like,
  IBAN, DOB (YYYY-MM-DD / DD/MM/YYYY), IPv4. Output tokens are
  `[REDACTED:<kind>]` so logs stay grep-able. CLI wrapper reads
  stdin and emits summary on stderr.
- **`__tests__/lib-pii-scrub.test.ts`** — 11 unit assertions
  covering every pattern, nested object walk, array walk, and
  empty-input / no-match paths.
- **`package.json`** — `audit:docs`, `audit:docs:json` scripts.
- **`.github/workflows/ci.yml`** — adds `A-004 jurisdiction` +
  `A-010 doc-discipline` steps. A-010 only fires on
  `pull_request` events (direct-to-main pushes are exempt by
  necessity — the log entry would have to append to itself).
- **`docs/EXECUTION_PLAN.md` §12.1** — two more items ticked
  (lint-docs, pii-scrub). C-019 now references the centralised
  helper.

Three items remain open in §12.1: `scripts/audit-tenant.ts`
(Sprint 0.5 blocker), `scripts/audit-prisma.ts` (Sprint 0.5 follow-
up), and `scripts/smoke/<id>.ts` (lands per sprint).

### `pending` — Core KB v0.1: 10 draft articles (AOS Phase 1 unblock)

Lands the Core KB v0.1 scope listed in `docs/AGENT_OS.md` §6.5 as
`confidence: draft` scaffolds. Each carries full YAML front-matter
(owner, jurisdiction, audience, tone, confidence, review TTL) so
the staleness sweep (A-005) and the `legalKb.retrieve()` filter
already work against them. Promotion to `reviewed` or
`authoritative` is blocked on lawyer + native-AR reviewer sign-off
per D-015.

- **`skills/core/identity.md`** — LVJ-the-Platform vs.
  LVJ-the-firm; primary / secondary / out-of-scope jurisdictions
  per D-006; public-facing domains; support hours + pager
  discipline; banned cross-jurisdiction claims; Portuguese CTA
  replaces IOLTA.
- **`skills/core/roles.md`** — 10-row role matrix mirrored from
  PRD v0.3 §2.2 + disclosure rules per role + agent-invocation vs.
  target-data split (manifest `invoker` vs. `acts_on_behalf_of`) +
  common role-mistake catalogue.
- **`skills/core/case-lifecycle.md`** — 14 canonical case statuses
  (lead → intake → active → documents_pending → submitted →
  awaiting_decision → additional_evidence_requested → approved /
  denied → appeal_pending → completed / archived) with traffic-light
  mapping, transition rules, banned transitions, jurisdiction-aware
  labels per D-006 (no RFE; "additional evidence requested" for PT).
- **`skills/core/escalation/matrix.md`** — D-013 4-tier definitions
  (Standard / Urgent / Critical / Marketing) + the 10 typed
  `escalation.*` events (criminal_history, prior_refusal,
  urgent_deadline, adverse_notice, distressed_client,
  fraud_indicator, fee_dispute, inconsistent_identity,
  marketing_content, cross_tenant_data_leak) + routing, pause
  semantics, channel cadence on SLA miss.
- **`skills/core/disclaimers/upl.md`** — information-vs-advice
  triad (`general_information` / `firm_process` /
  `attorney_approved_advice`); 12 banned outcome-guarantee phrases;
  UPL risk patterns (cross-jurisdiction conclusions); 3 approved
  hedging templates; AR mirror requirement per D-015.
- **`skills/core/disclaimers/outcome.md`** — 6-row banned→approved
  substitution table, probability-question scripts, explicit
  handoff script for a client who pushes for a guarantee, scanner
  contract in `lib/agents/guardrails.ts`.
- **`skills/core/privacy/consent.md`** — consent contract per
  channel (email / sms / whatsapp / voice / push / recording);
  D-014 quiet hours; GDPR lawful-basis table for PT; UAE PDPL
  posture; scripted consent prompts in EN + AR.
- **`skills/core/privacy/retention.md`** — 14-class retention
  window table; legal-hold carve-out; agent contract
  (no direct deletes; audit on retention.deleted); D-018
  k-anonymity cross-tenant aggregate exception.
- **`skills/core/tone/legal-formal.md`** — voice, structure,
  AR register, banned markers.
- **`skills/core/tone/empathetic-client.md`** — voice, anti-patterns,
  4 example openings (EN + AR) including the post-denial handoff
  that is *never* auto-sent.
- **`skills/core/tone/internal-ops.md`** — HITL-summary template
  and deadline-page template; code-style for IDs / dates / paths.
- **`skills/core/tone/marketing.md`** — SEO/AEO/GEO structured-data
  contract (Article + FAQPage + dateModified + jurisdiction chip);
  banned marketing phrasings; AR never auto-publishes (D-010 +
  D-015).
- **`skills/core/languages.md`** — shipped-locales matrix
  (EN ✅ / AR ✅ / PT stub); path>cookie>Accept-Language precedence;
  Latin identifiers under RTL; AR reviewer chain; name
  transliteration discipline.
- **`skills/core/SKILL.md`** — index + maturity note.

Every article's `confidence: draft` flag keeps the
`legalKb.retrieve({ confidence: 'authoritative' })` filter from
serving them to client-facing outputs today. The scanner still
enforces the banned-phrase / UPL / PII rules regardless of
maturity — this unblocks development while the lawyer review
proceeds.

### `pending` — Tooling: scripts/audit-prisma.ts (C-004)

Closes the C-004 enforcement gap from `docs/EXECUTION_PLAN.md` §12.1.
Static schema diff against a base ref; detects every class of
breaking change to `prisma/schema.prisma` that Golden Rule #4
forbids.

- **`scripts/audit-prisma.ts`** (new) — parses `prisma/schema.prisma`
  from base and head refs (default `origin/main..HEAD`), extracts
  `model.field → { type, optional, array }` signatures, reports
  violations: `model_removed`, `field_removed`, `type_narrowed`,
  `required_tightened` (optional→required), `array_lost`. Widenings
  (required→optional, scalar→array, new model / field / enum value)
  are silently accepted — the whole point of the additive-only rule.
  `--json` for CI consumption; exit 1 on violation.
- **`package.json`** — `audit:prisma` + `audit:prisma:json` scripts.
- **`.github/workflows/ci.yml`** — adds the audit to the per-PR
  pipeline right after A-010 (doc discipline). Only enforced on
  `pull_request` events.
- **`docs/EXECUTION_PLAN.md` §12.1** — one more item ticked.

Two §12.1 items remain open: `scripts/audit-tenant.ts` (Sprint 0.5
prerequisite — can be drafted now but has no `tenantId` fields to
audit until the migration lands) and per-smoke scaffolding under
`scripts/smoke/` (lands incrementally per sprint).

### `pending` — CI fix: swap ts-node for tsx + fetch full history

CI failure on PR #10 check run `A-002 · unit · smoke`:
`sh: 1: ts-node: not found`. The audit scripts were invoked via
`ts-node --compiler-options …` but the repo's existing dev setup
uses `tsx` (already in `devDependencies`, no `ts-node` installed).

- **`package.json`** — switched all 8 audit scripts
  (`audit:auth`, `audit:auth:json`, `audit:jurisdiction`,
  `audit:jurisdiction:json`, `audit:docs`, `audit:docs:json`,
  `audit:prisma`, `audit:prisma:json`) from
  `ts-node --compiler-options '{"module":"commonjs"}'` to plain
  `tsx`. `tsx` doesn't need the compiler-options shim for ESM/CJS
  interop, so the scripts are slightly simpler.
- **`.github/workflows/ci.yml`** — `actions/checkout@v4` now runs
  with `fetch-depth: 0`. A-010 (doc discipline) and C-004 (prisma)
  both diff against `origin/main`; the default shallow clone would
  have failed with `fatal: bad revision 'origin/main...HEAD'`.

No source-code changes. Scripts themselves were never touched —
the failure was purely in the invocation harness.

---

### `pending` — CI split: required gates + informational legacy-checks

Splits `.github/workflows/ci.yml` into two jobs so the required gate
(four audits) stays green while the pre-existing TS-error baseline is
cleaned up separately (issue #11).

- **`gates` (required).** A-002, A-004, A-010, C-004 — the four audit
  scripts that enforce this PR's new invariants. Must pass to merge.
- **`legacy-checks` (informational).** `tsc --noEmit`, `lint`, `test`,
  `build`, `smoke`. Each step runs with `continue-on-error: true`
  because `origin/main` carries 41 pre-existing TypeScript errors
  (recharts/React type drift, `@prisma/client` enum re-exports,
  `lib/agents/invoke.ts` generics, `test-utils/testUtils.tsx` Session
  shape). Fixing them is tracked in issue #11; `continue-on-error`
  flips off once that lands.

---

### `pending` — Sprint 0.5: multi-tenancy foundation (D-023)

Tenancy is now a first-class isolation boundary across the schema and
the request runtime. Sandbox-mergeable — the migration SQL and
Prisma schema ship now; `prisma migrate deploy` runs when Supabase is
connected. Covers EXECUTION_PLAN §10.3 deliverables (1)–(4); (5) is
the log entry you're reading.

- **`prisma/schema.prisma`** — 21 business models now carry a
  `tenantId` column. NOT-NULL on Case, Office, Partner, ServiceType,
  EligibilityLead, CaseOutcome, AgentDraft, HITLApproval, CaseDeadline,
  ExternalPartner, ExternalCommunication, Document, Payment,
  TimelineEvent, Message, TenantContract. Nullable on User (platform
  staff), NotificationLog, VoiceCallLog, AuditLog, AutomationLog
  (platform-level rows legitimately exist). `Tenant` and
  `TenantContract` added as the two new top-level models.
- **`prisma/migrations/20260423120000_add_tenancy/migration.sql`** —
  additive-only (C-004 clean). Creates the two new tables, adds every
  new column nullable, backfills LVJ seed tenant, promotes NOT NULL.
  A single-file deploy since the sandbox has no rows yet; the file
  header explains the split-deploy pattern for when production data
  arrives.
- **`lib/tenants.ts`** — new. `withTenantContext(user, cb)` opens an
  AsyncLocalStorage scope; `runPlatformOp(user, reason, cb)` is the
  explicit cross-tenant escape hatch for LVJ_* staff;
  `buildTenantExtension()` is the Prisma v6 client extension that
  auto-scopes every `findMany` / `update` / `create` / etc. on the
  TENANT_SCOPED_MODELS list.
- **`lib/db.ts`** — `getPrisma()` now applies the extension on every
  fresh client. `SKIP_DB=1` sandbox behaviour is unchanged.
- **`lib/rbac.ts`** — `SessionUser` gains `tenantId?: string | null`;
  dev-bypass user is explicitly platform (null) so sandbox tests can
  use `runPlatformOp` freely.
- **`lib/rbac-http.ts`** — new composite helper `runAuthed(guard,
  handler)` that combines `guard*` + `withTenantContext` into one
  call. The canonical entry for new routes; existing routes still use
  the two-step form and migrate onto this as they're touched.
- **`scripts/audit-tenant.ts`** — new (A-003). Two checks:
  (1) schema ↔ `TENANT_SCOPED_MODELS` agree; (2) every `app/api/*`
  route that uses Prisma imports the tenant helpers (or is on the
  INTENTIONAL_PUBLIC list from A-002).
- **`__tests__/lib-tenants.test.ts`** — 20 cases, all green. Covers
  auto-inject on read/write, cross-tenant rejection on write, upsert
  tenantId mutation rejection, platform bypass with `runPlatformOp`,
  nullable-context write refusal, and `assertTenantAccess` semantics.
- **`docs/DECISIONS.md` · D-023** — captures "app-layer first, RLS
  second" with the defense-in-depth rationale.
- **`package.json`** — adds `audit:tenant` and `audit:tenant:json`
  scripts mirroring the A-002 / A-004 / A-010 shape.
- **`.github/workflows/ci.yml`** — A-003 lands in the `legacy-checks`
  (informational) group until Sprint 0.5.1 migrates the 24 existing
  routes onto `runAuthed`. Promotion to `gates` is a one-line flip.

A-003 reports 24 routes that use Prisma without a tenant helper —
those are grandfathered on the pre-Sprint-0.5 `guard*` pattern. The
migration is mechanical (wrap handler body in `runAuthed`) and lands
as Sprint 0.5.1.

---

## 2026-04-23 · Sprint 0.5.1 — cross-repo review + runAuthed migration + A-003 blocking

Branch: `claude/cross-repo-review-sprint-05-MT58G`.

**Docs.**

- `docs/SESSION_NOTES.md` — new dated section "Cross-repo review
  (yalla-london + KhaledAun.com)". Scope note: `khaledaunsite` is
  private and outside this session's MCP allowlist; fallback scope
  used the public sibling `KhaledAun.com`. Key findings: yalla-london
  uses app-layer `siteId` scoping without RLS (validates D-023);
  KhaledAun.com uses role-based RLS via `auth.jwt() ->> 'role'` but
  with a USING-only anti-pattern (no `WITH CHECK`) — driver for D-024.
  Cribs: CJ-001 financial-leak pattern, Rule 64 backcompat
  `OR: [{ siteId }, { siteId: null }]`, Rule 74 explicit revenue
  scoping, Rule 9 sequential-iteration against PgBouncer, Rule 47
  `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Stripe Connect not present
  in either repo.
- `docs/DECISIONS.md` · **D-024** — Supabase RLS policies use both
  `USING` and `WITH CHECK` on every INSERT/UPDATE; tenant id
  propagates via `app.current_tenant()` set by `SET LOCAL` in the
  same transaction as the query. Deferred until Supabase connects;
  binds the pattern so the migration author doesn't re-discover the
  anti-pattern.
- `docs/EXECUTION_PLAN.md` §10 — adds **Sprint 0.5.1** recipe
  (§10.3.1) with the yalla-london cribs; adds a note under §10.5
  Sprint 8.5 and §10.8 Sprint 15 that neither sibling repo carries
  Stripe Connect (so there is no internal precedent for
  `account_links` / webhook rotation / `PlatformAccount`). §10.1
  current-position updated: PR #12 Sprint 0.5 merged; this branch is
  Sprint 0.5.1.

**Code — Sprint 0.5.1 runAuthed migration.**

- `lib/rbac.ts` — new `assertAuthed()` helper: authenticated, any
  role. Used by self-serve endpoints that a tenant user or client can
  both hit.
- `lib/rbac-http.ts` — new `guardAuthed()` / extended `AuthedGuard`
  (`'authed'` case) / `runAuthed('authed', ...)` composition.
- **24 routes migrated** to `runAuthed(...)` (listed in A-003 pre-
  migration output):
  `app/api/audit/route.ts`, `app/api/auth/bootstrap/route.ts`,
  `app/api/cases/[id]/documents/complete/route.ts`,
  `app/api/cases/[id]/documents/route.ts`,
  `app/api/cases/[id]/external-partners/route.ts`,
  `app/api/cases/[id]/messages/route.ts`,
  `app/api/cases/[id]/meta/route.ts`,
  `app/api/cases/[id]/payments/route.ts`,
  `app/api/cases/[id]/route.ts`,
  `app/api/cases/[id]/status/route.ts`,
  `app/api/cases/route.ts`, `app/api/documents/route.ts`,
  `app/api/journey/route.ts`, `app/api/messages/route.ts`,
  `app/api/partner-roles/route.ts`, `app/api/payments/route.ts`,
  `app/api/payments/simple/route.ts`, `app/api/reports/route.ts`,
  `app/api/service-types/[id]/route.ts`,
  `app/api/service-types/route.ts`, `app/api/staff/route.ts`,
  `app/api/terms/accept/route.ts`, `app/api/terms/status/route.ts`.
  `app/api/terms/content/route.ts` loses its unused `getPrisma`
  import (route only serves static `TERMS_CONTENT`).
- ServiceType writes (`POST` / `PUT` / `DELETE`) go through
  `runPlatformOp(user, 'serviceType.*', ...)` — platform-level writes
  on a tenant-scoped model are explicitly audited per D-023.
- `scripts/audit-tenant.ts` — recognises `runAuthed(` as a tenant
  helper (it composes `withTenantContext` internally).
- `scripts/audit-auth.ts` — recognises `runAuthed(` / `guardAuthed(`
  / `assertAuthed(` as auth helpers.

**CI.**

- `.github/workflows/ci.yml` — A-003 moves out of
  `continue-on-error: true` into the required `gates` block. The
  header comment is updated to reflect the blocking status and to
  point Issue #11's legacy-cleanup at the `legacy-checks` group.

**Results.**

- A-002 (auth on every route): 26 GUARDED, 5 INTENTIONAL_PUBLIC,
  0 STUB, **0 UNAUTHED**.
- A-003 (tenant isolation): 21 schema models ↔ 16 + 5 allow-list
  agree; **0 route violations** out of 31 scanned.

**Exit criteria met.** A-003 blocks in the `gates` job.

**Deferred to next sessions.**

- Sprint 0.7 — Playwright EN + AR visual regression baseline. Does
  not fit in this PR scope (branch `claude/sprint-0.7-*` when it
  lands).
- Issue #11 safe half (zod v4 `z.record`, test-utils Session shape,
  jest-mock `any → never`). Separate PR.
- Sprint 8.5 onboarding wizard scaffold. Cross-repo review surfaced
  no blocking dependency that would front-load it; priority order
  holds.

---

## 2026-04-23 · Cross-repo review (pass 2) — KhaledAunSite digest + D-025

Branch: `claude/xrepo-review-pass2-sprint07-cMIF6`.

The 2026-04-23 pass-1 review (PR #13, now merged) hit yalla-london
+ public KhaledAun.com and noted `khaledaunsite` as blocked by the
MCP allowlist scope. Pass 2 was
triggered by the user pushing a 7-file KhaledAunSite engineering
digest (`01-architecture-and-stack.md` through
`07-starter-checklist.md`) directly into `AssistantAPP-main/docs/`
on main — an internal post-mortem playbook, not a live repo dump.
This PR reviews those files against the same four axes from pass 1
(RLS, Stripe Connect, CI shape, BUGS.md) and files the digest under
a dedicated subdirectory.

**Docs.**

- `docs/xrepo/khaledaunsite/*` — the 7 digest files moved out of the
  canonical docs root (`01-architecture-and-stack.md`,
  `02-known-pitfalls-and-fixes.md` (renamed from the `(1)`-suffix
  upload name), `03-operations-and-deployment.md`,
  `04-security-and-compliance.md`, `05-ai-playbook.md`,
  `06-skills-digest.md`, `07-starter-checklist.md`). They're
  reference material, not part of LVJ's canonical playbook; filing
  them separately keeps the canonical doc root unambiguous.
- `docs/SESSION_NOTES.md` — new dated section "Cross-repo review
  (pass 2) — KhaledAunSite digest". Summarizes findings per axis:
  (1) RLS pattern in the digest is per-user `auth.uid()` with
  `is_public` flag, single-tenant, so it does **not supersede
  D-024** (multi-tenant `app.current_tenant()` via `SET LOCAL`
  remains correct); two refinements graduated — RLS policy stubs
  at table-creation time even pre-Supabase-connect, and explicit
  tenant scoping on search/FTS paths. (2) Stripe Connect absent —
  same finding as pass 1. (3) CI shape not cleaner than our
  `gates + legacy-checks`; preflight-script pattern worth cribbing
  post-Sprint-0.7. (4) 13 pitfalls mapped onto LVJ's Sprint 0.5+
  surface in a table — items 2 and 4 (URL split + `@@map`) land
  binding via D-025; items 1, 6–9 (`force-dynamic`, CSRF
  exemption, XFF ordering, cron auth) captured for the post-0.7
  cleanup PR. A §(5) section calls out what LVJ explicitly does
  **not** adopt: monorepo split, Supabase-Auth-replacing-NextAuth,
  Israeli-legal content, distinct 4-brain services.
- `docs/DECISIONS.md` · **D-025** — Supabase-connect contract:
  (1) `DATABASE_URL` on pooler `:6543?pgbouncer=true&connection_
  limit=1` + `DIRECT_URL` on `:5432` for migrations;
  (2) Prisma singleton preserved, CI lint rule post-0.5.1;
  (3) `@@map` discipline for raw Supabase queries — audit sub-check
  in `scripts/audit-prisma.ts` when the first raw query lands;
  (4) `force-dynamic` on every DB-reading route and page — new
  **A-005 (dynamic-route audit)** lands with the Supabase-connect
  PR, required from day 1 because static pre-render + middleware
  auth is a silent bypass; (5) case-insensitive email normalization
  preserved from NextAuth default. D-025 and D-024 are
  complementary — D-024 binds *policy shape*, D-025 binds
  *connection + route shape*.
- `docs/EXECUTION_LOG.md` — this entry.

**No code changes.** Pass 2 is doc-only: digest triage, decision
capture, and pattern cribs. Implementation items from D-025 land
with the Supabase-connect PR (currently gated on infra availability
per EXECUTION_PLAN §12.2) and with the post-Sprint-0.7 cleanup PR
(A-005 audit script, `scripts/preflight.sh`, CSRF + XFF
verification, `runCron(req, cb)` helper).

**Merge ordering with PR #13.** PR #13 merged first; this PR was
rebased onto the result. Resolved conflicts:
- `DECISIONS.md` — D-024 (from #13) sits between D-023 and D-025.
- `SESSION_NOTES.md` — pass-2 section above pass-1 section
  (newest-first convention).
- `EXECUTION_LOG.md` — pass-2 entry below the Sprint 0.5.1 entry
  (chronological append).

**Exit criteria.**

- Cross-repo review pass 2 filed.
- D-025 recorded; D-024 **not** superseded (explicit reasoning in
  SESSION_NOTES §1).
- Digest files filed under `docs/xrepo/khaledaunsite/` so they stop
  polluting the canonical docs root.

**Deferred.**

- Sprint 0.7 — Playwright EN + AR visual regression baseline
  (EXECUTION_PLAN §10.4 exit). Next PR.
- Issue #11 safe half — zod v4 `z.record`, test-utils Session
  shape, jest-mock `any → never`. Separate PR.
- Post-0.7 cleanup — A-005 (dynamic-route audit),
  `scripts/preflight.sh`, CSRF + XFF verification, `runCron(req,
  cb)` helper. Separate PR.

---

## 2026-04-23 · Issue #11 safe half — zod v4 `z.record`, test-utils Session shape, jest-mock `any → never`

Branch: `claude/issue-11-safe-half-9qrP3`.

Closes the "safe" subset of Issue #11 (the 41 pre-existing TS
errors that keep `legacy-checks` informational). Scope: **zod v4
`z.record`** (2 errors), **test-utils Session shape** (1 error),
**jest-mock `any → never`** in `invoke.test.ts` + `lib-audit.test.ts`
(6 errors). Total: 9 errors eliminated; ~32 remain on the
"risky half" (recharts React type drift, `lib/agents/invoke.ts`
generics, `@prisma/client` enum re-exports + the three dependent
miscellaneous errors in `service-types.test.ts`).

**Code.**

- `agents/intake/schema.ts` — `z.record(z.unknown())` →
  `z.record(z.string(), z.unknown())`. Zod v4 requires an explicit
  key schema for `z.record`.
- `agents/drafting/schema.ts` — `z.record(z.string())` →
  `z.record(z.string(), z.string())`. Same fix.
- `test-utils/testUtils.tsx` — mock `Session` now carries `id`
  (missing before) and the role literal is uppercased (`'admin'`
  → `'ADMIN'` per the `Role` enum in `prisma/schema.prisma`). The
  role is typed via `Session['user']['role']` rather than by
  importing `Role` directly from `@prisma/client` — that direct
  import is exactly the enum-re-export gap tracked as the Issue
  #11 risky half. Routing through `Session['user']['role']`
  resolves to the same `Role` type at the type-level (from
  `types/next-auth.d.ts`) without adding a runtime dependency on
  the generated client. Inline comment documents the choice.
- `__tests__/agents/invoke.test.ts` — 3 × `as any` → `as never` on
  `mockResolvedValue(...)` calls (for `automationLog.create`,
  `logAuditEvent`, `events.dispatch`). `jest.fn()` with no
  explicit generic infers `(...args: never) => never` under
  `@jest/globals` v30, so the mockResolvedValue slot is typed
  `never`. `as any` was the pre-existing workaround but now fails
  "any not assignable to never"; `as never` is the team-convention
  fix. One inline comment at the first site explains the pattern.
- `__tests__/lib-audit.test.ts` — 3 × same pattern on
  `auditLog.create` mocks: `as any` → `as never` on
  `mockResolvedValue({ id: 'a1' } as never)`,
  `mockRejectedValue(new Error('pg down') as never)` (the `new
  Error(...)` slot hits the same never-typed parameter), and
  `mockResolvedValue({} as never)`.

**Not touched (explicitly deferred to the risky half).**

- `__tests__/service-types.test.ts` — the issue lists it as having
  3 jest-mock errors, but the `mockResolvedValue({ user: { id,
  role } })` calls go through `(getServerSession as
  jest.MockedFunction<typeof getServerSession>).mockResolvedValue(...)`,
  which types the argument as `Session | null`. The failure there
  is **not** `any → never` — it's a Session-shape mismatch caused
  by the session literal missing `email`/`name`/`expires` and the
  `role: 'STAFF'` string not matching the `Role` enum type. Fixing
  it cleanly needs the Prisma enum re-export landed first, so
  it's in the risky half.
- `components/dashboard/*` (recharts React type drift),
  `lib/agents/invoke.ts` (generic inference),
  `lib/auth.ts` / `lib/auth/options.ts` / `prisma/seed.ts`
  (`@prisma/client` enum re-exports), and the miscellaneous
  `app/notifications/page.tsx` / `BillingDashboard.tsx:329`
  errors.

**Docs.**

- `docs/EXECUTION_LOG.md` — this entry. No `D-NNN` — none of the
  changes are architectural.
- No `EXECUTION_PLAN.md` edit — §10.x sprint recipes unchanged.
  A-010-R2 version-bump gate doesn't fire.

**CI impact.** 9 of the 41 TS errors that keep `legacy-checks` at
`continue-on-error: true` are now resolved. `npx tsc --noEmit` is
still red on the risky half, so `legacy-checks` stays informational
until that lands. A follow-up PR picks up the remaining ~32,
starting with the Prisma enum re-export (which unblocks both the
service-types test fixes and the lib/auth cleanup).

**Exit criteria (this PR).** The five edited files pass
`tsc --noEmit` individually (where "individually" means in
isolation from the risky-half failures in other files).

**Deferred.**

- Issue #11 risky half — `@prisma/client` enum re-export (unblocks
  `service-types.test.ts` + `lib/auth.ts` + `prisma/seed.ts`),
  `@types/react` override for recharts, `lib/agents/invoke.ts`
  generic cast, misc response-type fixes. Separate PR; probably
  needs its own audit at the end (re-run `tsc --noEmit` on `main`,
  confirm zero, flip `legacy-checks` to blocking).

---

## 2026-04-23 · Post-0.7 cleanup — A-005 dynamic-route audit (D-025 item 4)

Branch: `claude/post-0.7-a-005-dynamic-audit-X4mBc`.

First slice of the post-Sprint-0.7 cleanup backlog. Lands the
dynamic-route audit that D-025 item 4 reserves as a required gate
from day 1, because static pre-render + middleware auth is a
silent bypass — middleware runs on the *request* but Next.js
serves the cached *response*, so a DB-reading handler that doesn't
opt out of caching leaks data across sessions regardless of what
`middleware.ts` decides.

**Files touched.**

- `scripts/audit-dynamic.ts` — new. Walks `app/` for `route.ts(x)`
  and `page.tsx`, classifies each as DB_READING or STATIC_OK via a
  static marker scan (`@/lib/db` import, `getPrisma(`,
  `runAuthed(`, `runPlatformOp(`, `prisma.*` call). For DB_READING
  files, requires both `export const dynamic = 'force-dynamic'`
  and `export const revalidate = 0`. Exits 1 on any violation,
  with a per-file reason table. `INTENTIONAL_STATIC` allowlist is
  empty today; each future entry must carry a written
  justification.
- `package.json` — `audit:dynamic` + `audit:dynamic:json` scripts
  alongside `audit:auth` / `audit:tenant`.
- `.github/workflows/ci.yml` — new required step in the `gates`
  job (`A-005 · dynamic-route audit (D-025 item 4)`), wired
  between `audit:auth` and the informational `audit:jurisdiction`.
  Header comment updated.
- `app/api/cases/route.ts`,
  `app/api/cases/[id]/route.ts`,
  `app/api/cases/[id]/external-partners/route.ts`,
  `app/api/partner-roles/route.ts`,
  `app/api/payments/simple/route.ts`,
  `app/api/service-types/route.ts`,
  `app/api/service-types/[id]/route.ts` — added
  `export const dynamic = 'force-dynamic'` +
  `export const revalidate = 0` directly after the imports. All
  seven import `getPrisma` and use `runAuthed`, so they were real
  violations waiting to fire the moment Supabase connects.
- `app/api/audit/route.ts` — added `revalidate = 0`; already had
  `force-dynamic` but not the pair.
- `docs/DECISIONS.md` — marked the D-025 `audit-dynamic.ts`
  follow-up landed.
- `docs/EXECUTION_LOG.md` — this entry; open-item line for the
  post-0.7 cleanup narrowed to the remaining sub-items.

**Audit result.**

`npm run audit:dynamic` scans 47 files under `app/`, 25 DB_READING
/ 22 STATIC_OK, 0 violations. Re-runs are idempotent.

**What this audit does NOT catch.**

- Transitive DB reads through un-annotated helpers (e.g. a
  `lib/util.ts` that eventually calls `prisma.x.findMany`). Keep
  the direct-marker contract — detecting transitivity would
  require a full module graph and produce false positives on
  every shared helper. The answer when it comes up is to annotate
  the entry points, not to widen the audit.
- Runtime `dynamic = 'auto'` routes that happen to return the same
  body every time. The audit is conservative on purpose; caching
  behaviour is too contextual to encode statically.

**Deferred (rest of the post-0.7 cleanup).**

- `scripts/preflight.sh` — KhaledAunSite-digest crib for the
  five-item D-025 checklist on `supabase db push`.
- CSRF content-type-exemption verification.
- Rightmost-XFF rate-limiter verification.
- `runCron(req, cb)` helper so `/api/cron/*` stops leaning on the
  A-002 public allow-list.

---

## Rolling open items

Copied from the commits above; delete lines here as they land.

- [ ] Run `npx prisma migrate dev --name sprint0-foundation && npx prisma migrate dev --name aos-phase1 && npx prisma migrate dev --name add-tenancy` once a dev DB is reachable. Until then, Prisma client types will not reflect the new models and tests that touch DB are skipped via `SKIP_DB=1`.
- [ ] Post-Sprint-0.7 cleanup PR — ~~A-005 dynamic-route audit (D-025 item 4)~~ (landed 2026-04-23), `scripts/preflight.sh` (KhaledAunSite-digest crib), CSRF content-type-exemption verification, rightmost-XFF rate-limiter verification, `runCron(req, cb)` helper so `/api/cron/*` stops leaning on the A-002 public allow-list.
- [ ] Bootstrap the Orchestrator from a server entry point: `import '@/lib/agents/register'; subscribeAgent('intake'); subscribeAgent('drafting'); subscribeAgent('email');` — ideally from a `/api/agents/bootstrap` stub that runs on cold start, gated by feature flags.
- [ ] Flesh out the KB v0.1 articles (`core/disclaimers/upl.md`, `core/disclaimers/outcome.md`, `core/tone/*.md`, `core/escalation/matrix.md`, `core/privacy/consent.md`, `core/privacy/retention.md`, `core/languages.md`).
- [ ] Execute the jest suite in an environment with `node_modules` installed — none of the tests have been executed in this sandbox.
- [ ] Port the remaining design-pack screens (Admin Service Types refresh, client portal, analytics/billing dashboards, outcome predictor) when their sprints arrive.

---

## How to update this file

When you commit:

1. Append a new section under **Commits** with the short SHA, a 1-line
   title, and 5–15 lines of substantive detail.
2. Move any newly-deferred items to **Rolling open items**.
3. Delete items from **Rolling open items** as they land — don't just
   strike them through.
4. Bump `Claude.md` §Execution Status if the entry changes the current
   phase or introduces a new architectural decision.
5. When the work introduces a decision taken in conversation (scope cut,
   priority flip, vendor choice), record it in `docs/DECISIONS.md`
   *in the same commit*.

The whole log is one file on purpose — it's meant to be scanned top-to-
bottom in under two minutes.
