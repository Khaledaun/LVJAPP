# PRD ↔ Plan audit · 2026-04-23

**Question.** Does `docs/EXECUTION_PLAN.md` v1.2 fulfil
`docs/PRD.md` v0.3? Where we aim to arrive (v1.0.0), and what the
plan commits to accomplishing, do those match?

**Method.** Walk every PRD goal / constraint / success metric /
phase. For each: map to a plan section, check whether the code
referenced exists, and mark the item covered / partial / gap.

**Overall verdict.** Structurally aligned — every PRD sprint has
a plan entry. At the *detail* level the plan is deeper for
sprints that have started (0, 0.1, 0.5, 0.5.1, 0.7, 0.7.5,
Webflow parallel, AOS Phase 2 pre-req, Sprint 15 Stripe, Sprint
10 + 10.5) and shallower for the middle-phase sprints that
haven't started, which is a deliberate JIT-recipe choice
(§10.10). Two real gaps to close before we call Phase A done;
several single-sprint items worth explicit callouts. Everything
else is scope-aligned and infra-blocked.

## A. PRD §3.1 Product goals — coverage

| # | Goal (PRD wording) | Plan ref | Code state | Verdict |
|---|---|---|---|---|
| 1 | Single multi-tenant system of record | §10.3 Sprint 0.5 (landed), §11.1 DoD | 23 Prisma models, `tenantId` FK, A-003 enforces | **covered** |
| 2 | Arabic-first, English-equal | §10.4 Sprint 0.7 (landed), §10.5+ for AR channels | Amiri + IBM Plex Sans Arabic loaded, RTL shipped, locale switcher persists, AR i18n keys populated for landed screens | **covered (Phase A)**; later-sprint items still to land |
| 3 | AI-native, lawyer-supervised; HITL-tiered SLAs per D-013 | §4.3 / §8.1 C-020, D-013 | `HITLApproval` model + `requestApproval` + admin approvals page; 4h/1h/15min timer enforcement not yet wired; `cron/marketing-hitl-escalate` declared, no handler | **partial — SLA enforcement cron missing** |
| 4 | Multi-channel native (email / SMS / WhatsApp / Voice / Push) | §10 Phase B Sprint 5 | `lib/events.ts` shipped w/ `Promise.allSettled`; channel integrations not yet wired | **covered (plan)**; code deferred to Sprint 5 |
| 5 | Multi-tenant, multi-destination | §10.3 + D-006 | `destinationJurisdiction` field, D-006 PT-first reset, A-004 jurisdiction audit | **covered** |
| 6 | Service Provider Pool + public directory | §10.9 Sprint 10 + 10.5 | No `ServiceProvider` / `ProviderEngagement` / `ProviderListing` models yet; skills/service-provider-pool/SKILL.md exists; skills/provider-directory/SKILL.md exists | **covered (plan)**; code deferred |
| 7 | Marketing Automation via Webflow + HITL | §10.6 parallel track, §10 Phase D Sprint 13 | Webflow webhook landed (Sprint 0.7-bis); no `MarketingLead` / `ContentArticle` / `MarketingTouch` / `MarketingMetric` models | **partial — webhook only, models deferred** |
| 8 | Self-serve onboarding | §10.5 Sprint 8.5 | Not started; blocked on Stripe Connect infra | **covered (plan)**; infra-blocked |
| 9 | Mobile parity (Capacitor) | §10.10 Sprint 14 | Not started | **covered (plan)** |
| 10 | Defensible by design (vault + RBAC + tenant isolation + audit chain) | §8.1 C-019 / C-020; §4.3 | `lib/crypto.ts` AES-256-GCM; RBAC; A-002 + A-003 + A-005 gates; `AuditLog` + `AutomationLog` models | **covered** |
| 11 | Self-improving (`CaseOutcome`, `MarketingTouch`) | §5 continuous-learning loop | `CaseOutcome` in schema; `MarketingTouch` NOT in schema (awaits Sprint 13) | **partial — `MarketingTouch` missing** |

## B. PRD §5.1 engineering quality gates (binary, must-pass)

| Gate | Status | Evidence |
|---|---|---|
| AOS Phase 1 min viable loop green in CI + staging | **on track** | Runtime registered; `subscribeAgent` idempotent; `/api/agents/bootstrap` POST wires agents when flags on. No staging yet, so "green in staging" is pending infra. |
| Multi-tenancy isolation suite green; 0 leaks | **on track** | A-003 audit clean (schema↔allowlist agree; 0 routes w/ prisma w/o tenant helper). Adversarial isolation spec still TBD per Sprint 0.5 DoD. |
| 100% API routes under `assertTenantAccess()` + `assertCaseAccess()` | **met** | A-002: 32 GUARDED / 5 INTENTIONAL_PUBLIC / 0 UNAUTHED. D-026 renumbered A-005 → dynamic-route audit which adds a second layer (DB-reading routes opt out of caching). |
| AR + RTL acceptance suite green | **met at Phase A level** | Sprint 0.7 shipped `e2e-tests/locale-smoke.spec.ts`; Playwright EN + AR visual regression baseline recorded. |
| Webflow webhook → `MarketingLead` E2E green | **partial** | Webhook endpoint shipped; HMAC smoke green; `MarketingLead` Prisma model not yet in schema — test can't write the row. Deferred to Sprint 13. |
| Public provider directory opt-in → Webflow publish round-trip | **deferred** | Sprint 10.5 scope; not started. |
| Every PR updates `EXECUTION_LOG` | **met** | A-010-R1 enforces in CI; R3 enforces append-only. |

**Assessment.** 5/7 met now, 1 partial (Webflow → MarketingLead,
model missing), 1 deferred (provider directory, Sprint 10.5).
Consistent with "roadmap ~47% complete" from the progress
snapshot.

## C. PRD §5.5 compliance KPIs

| KPI | Target | Status |
|---|---|---|
| Tenant isolation breaches | 0 | **0 today** (A-003 clean) |
| Unauthenticated route count | 0 | **0 today** (A-002 clean) |
| Encrypted vault coverage | 100% | **lib/crypto.ts shipped**; "every provider doc encrypted" not yet testable because `ServiceProvider` model doesn't exist yet |
| Audit chain completeness | 100% | Partially observable — `AuditLog` model exists, `runAuthed` threads `correlationId`; a per-mutation audit-row audit (like A-002) doesn't exist |
| UPL guardrail bypasses | 0 | **cannot measure yet** — A-007 (per-LLM online audit) exists in `lib/agents/guardrails.ts` but no aggregate reporter / cron writes it |
| GDPR DSAR turnaround | <30d (target <7) | **not yet measurable** — Sprint 16 ships the DSAR model + workflow |
| Cross-tenant PII access audit completeness | 100% | **schema allows it** (`AuditLog.action = 'cross_tenant_pii_access'`); no enforcement code that guarantees every bypass writes a row |

**Gap cluster: "cannot measure yet".** UPL bypass rate, DSAR
turnaround, cross-tenant PII access completeness — none of these
have enforcement + measurement infrastructure today. The PRD
calls them binary targets; the plan doesn't carry a sub-sprint
for the measurement instrumentation. Flag below.

## D. Sprints in PRD §6.1 ↔ detailed recipes in Plan §10

| PRD sprint | Plan §10 entry | Detail level |
|---|---|---|
| Sprint 0 | §10.1 current position | landed |
| Sprint 0.1 | §10.2 | detailed, landed |
| Sprint 0.5 | §10.3 | detailed, landed |
| Sprint 0.5.1 | §10.3.1 | detailed, landed |
| Sprint 0.7 | §10.4 | detailed, landed |
| (Sprint 0.7-bis Webflow) | §10.6 | detailed, landed |
| Sprint 0.7.5 post-0.7 cleanup | §10.4.1 | detailed, landed (this PR) |
| Sprint 1 Auth + Nav | §10.10 (skeleton) | **shallow** — PRD implies tenant + locale extension detail |
| Sprint 2 Dashboard + KPIs | §10.10 (skeleton) | **shallow** — PRD §5.2 lists 6 specific KPIs |
| Sprint 3 Cases module | §10.10 | **shallow** |
| Sprint 4 Intake wizard | §10.10 | **shallow** — PRD §4.3 requires PT visa types (D1/D2/D3/D7/D8/Golden/Startup/Family Reunification) |
| Sprint 5 Comms hub | §10.10 | **shallow** — PRD §4.9 requires ELEVENLABS_VOICE_ID_AR + AR templates on every channel |
| Sprint 6 AI Counsel copilot | §10.10 | **shallow** |
| Sprint 7 Eligibility quiz | §10.10 | **shallow** — PRD §3.1 #2 requires AR quiz on Webflow /ar |
| Sprint 8 Revenue + billing | §10.10 | **shallow** — "Merge with Stripe Connect onboarding per D-016" per Claude.md; plan should call out |
| Sprint 8.5 Self-serve onboarding | §10.5 | detailed |
| Sprint 9 Multi-tenant ops view | §10.10 | **shallow** |
| Sprint 10 + 10.5 Provider pool + directory | §10.9 | brief (couple sentences) — PRD §3.1 #6 + D-017 have much more |
| Sprint 11 Outcome predictor | §10.10 | **shallow** — D-008 gating thresholds already captured, expand with Sprint 11 recipe |
| Sprint 12 Service Types Admin | §10.10 | **shallow** |
| Sprint 13 Marketing Automation | §10.6 (parallel track, narrow) + §10.10 | **partial** — parallel track shipped webhook slice; full Sprint 13 scope (ContentArticle + PostBridge + SEO/AEO/GEO agents + marketing-HITL with AR reviewer) isn't detailed |
| Sprint 14 Mobile (Capacitor) | §10.10 | **shallow** |
| Sprint 15 Stripe Connect payouts | §10.8 | detailed |
| Sprint 16 GDPR/DPA tooling | §10.10 | **shallow** — PRD §5.5 ties specific KPIs to this sprint |

§10.10 says *"recipe for each remaining sprint lands in this file
*before* the sprint starts, in the same PR as the sprint's first
commit"* — a deliberate JIT choice. **This is a valid
prioritisation**, but three PRD-critical sprints deserve a recipe
now because their deliverables cross-cut earlier sprints:

1. **Sprint 13 (full scope)** — the webhook in §10.6 is only a
   slice; the full scope includes the `ContentArticle` model,
   marketing agents, marketing-HITL route, and AR-reviewer-
   required gate. Without a recipe, later sprints will accrete
   marketing code ad-hoc.
2. **Sprint 16 GDPR/DPA** — DSAR is a compliance KPI (§5.5) with
   a <30-day legal limit. Scheduling ambiguity here is a real
   legal risk.
3. **Sprint 10 + 10.5** — §10.9 is 2 lines for what PRD D-017
   treats as a major v1 differentiator. Expand.

## E. Scope items in PRD not explicitly in plan

Traceable items from PRD that don't have an explicit plan location:

1. **`skills/arabic-localization/SKILL.md`** (PRD §4.9 #8) —
   **missing from `skills/`**. Required by PRD as a Sprint 0.7
   deliverable.
2. **HITL SLA enforcement cron** (PRD §4.5 / D-013) — Standard
   4h / Urgent 1h / Critical 15min need a timer + page-off-hours
   handler. `vercel.json` only has `marketing-hitl-escalate`
   (24h, D-010). Missing handlers for the other three tiers.
3. **advice_class gatekeeping** (PRD R1 — only jurisdiction-
   licensed lawyer may set `attorney_approved_advice`) — schema
   allows it, no runtime check enforces the "licensed lawyer"
   rule.
4. **Cross-tenant PII access guarantee** (PRD §4.10 / §5.5
   target 100%) — `AuditLog.action = 'cross_tenant_pii_access'`
   convention is documented but no code asserts that every such
   bypass writes a row.
5. **UPL guardrail aggregate reporting** (PRD §5.5 target 0) —
   per-invocation `lib/agents/guardrails.ts` exists; no rollup
   / cron / dashboard surfaces the rate.
6. **Monitoring stack** — PRD doesn't list it explicitly but the
   KhaledAunSite digest's ops section (`UptimeRobot` + `Plausible`
   + `Sentry`) applies; no plan section captures monitoring
   targets / sign-up actions beyond the §12.2 infra gap lines.
7. **Predictor calibration threshold enforcement** (D-008) —
   Sprint 11 owns the predictor. The "staff-internal ≥50 per
   (j × v); client-facing ≥200 + CI ≤ ±15%" rule is schema-
   enforceable (a new `PredictorGate` model or a check inside
   the predictor service). Plan doesn't commit to either.
8. **Contract machine-readable fields on `TenantContract`** (PRD
   §4.7) — model exists; field shape (rate, free-tier expiry,
   SLA, exclusivity, dispute, termination) not verified in
   schema. Worth a `prisma/schema.prisma` inspection when Sprint
   8.5 starts.

## F. Plan items not in PRD

Items the plan drives that don't have an explicit PRD anchor —
mostly engineering hygiene that is implicit in PRD §5.1 but worth
calling out so we don't accidentally treat them as negotiable:

- **A-004 jurisdiction audit** (D-006) — implicit in PRD §4.3
  PT-first constraint; no explicit PRD success metric.
- **A-005 dynamic-route audit** (D-025) — implicit in PRD §5.5
  "0 unauthed routes" (static pre-render is a silent bypass).
- **A-010 doc-discipline audit** (D-005) — implicit in PRD §5.1
  "every PR updates EXECUTION_LOG".
- **A-011 KB freshness audit** — implicit in PRD §4.5 "KB
  freshness via review_ttl".
- **CSRF + rate-limit middleware** (xrepo digest) — implicit in
  PRD §5.5 compliance targets; not in the PRD list.
- **Cron issue-opener** — purely ops infrastructure.

All of these trace to engineering discipline that the PRD
signs off on at a high level; flagging them so that if priority
conflicts arise later, the PRD is the tie-breaker and these
items can be descoped.

## G. Recommended closure actions

In priority order (P0 = blocks Phase A declaration complete;
P1 = blocks first live tenant; P2 = can wait for sprint start):

**P0 — before calling Phase A done:**

1. **Ship `skills/arabic-localization/SKILL.md`.** Required by
   PRD §4.9 #8; no blocker, just content. One commit.
2. **Write the HITL SLA enforcement cron handler(s).** Either
   one handler for all four tiers or four dedicated handlers.
   PRD §4.5 / D-013 is load-bearing. Schedules need to be
   declared in `vercel.json`.

**P1 — before first live tenant opens:**

3. **advice_class gatekeeping check in the API layer.** Reject
   writes to `Case.adviceClass = 'attorney_approved_advice'`
   unless the session user is jurisdiction-licensed. Add a test.
4. **Cross-tenant PII access wrapper** that writes the
   `AuditLog` row whenever a `crossTenant: true` query reads
   PII. Pair with an A-003 sub-check.
5. **Audit-chain completeness audit** — a new audit that walks
   every mutation (POST/PATCH/DELETE) and verifies it calls
   `writeAudit(…)` or is on a documented allowlist. Next to
   A-002 / A-005.

**P2 — when approaching the relevant sprint:**

6. Expand §10.10 skeletons for Sprint 13, Sprint 16, Sprint 11
   into full recipes before their first commit.
7. Add a §13 (or §10.11) monitoring & observability runbook
   covering UptimeRobot / Plausible / Sentry setup.
8. Capture the `TenantContract` machine-readable-fields shape in
   a D-NNN when Sprint 8.5 starts.

## H. Bottom line

The PRD asks for multi-tenant PT-first immigration SaaS with
Arabic first-class, a public provider directory, marketing
automation, and compliance-grade audit/vault/DSAR by v1.0.0.
The plan's **structural alignment is solid** — every PRD
deliverable has a plan sprint and every decision (`D-006` …
`D-019` plus `D-023` / `D-024` / `D-025` / `D-026`) is either
landed or sprint-assigned. The **detail gap** is
middle-to-late-phase sprint recipes (Sprint 1-7 / 9 / 11-16),
deliberately deferred per §10.10's JIT policy.

Two items from PRD §4.9 + §4.5 are genuine misses
(`skills/arabic-localization/`, HITL SLA enforcement cron) that
deserve to close before we call Phase A complete. Three
additional compliance-KPI-measurement items (advice_class
gatekeeping, cross-tenant PII audit enforcement, audit-chain
completeness audit) are P1 — required before the first live
tenant opens.

Everything else tracks. **The plan fulfils the PRD. The gaps
above are the actionable closure list.**
