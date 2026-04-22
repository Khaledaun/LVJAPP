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

All current work is on `claude/phase-0-audit-NWzaW` (per the harness
routing rule). Merges to `main` happen PR-by-PR; commits below are on
the feature branch, chronological.

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

---

## Rolling open items

Copied from the commits above; delete lines here as they land.

- [ ] Run `npx prisma migrate dev --name sprint0-foundation && npx prisma migrate dev --name aos-phase1` once a dev DB is reachable. Until then, Prisma client types will not reflect the new models and tests that touch DB are skipped via `SKIP_DB=1`.
- [ ] Close the 11 API routes that still lack auth guards (see Phase 0 audit §9).
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
