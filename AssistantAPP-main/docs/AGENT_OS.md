# LVJ Agent Operating System (AOS)

> Version 0.1 · Draft · 2026-04-22
> Owner: founding engineer · Status: proposed · Supersedes: ad-hoc automation notes

---

## 0. Why this document exists

The Sprint 5+ scope (WhatsApp, voice, social, multi-office, outcome prediction, client portal automations)
cannot be built as a pile of independent route handlers. Treated naively, we end up with:

- duplicated prompt code in every API route,
- inconsistent tone / disclaimers across channels (legal exposure),
- no single place to pause outbound comms when a case hits a legal risk flag,
- no way to tell whether an LLM call cost 2¢ or 20¢, succeeded or silently degraded,
- no regression safety when we change a prompt.

We need an **Agent Operating System (AOS)** — a thin, opinionated runtime on top of the
foundation built in Sprint 0 (`lib/events.ts`, `lib/ai-router.ts`, `lib/audit.ts`,
`lib/rbac.ts`, `AuditLog`, `AutomationLog`) that turns "Intake Agent", "Drafting Agent",
"Deadline Agent" from slideware into first-class, versioned, auditable software artefacts.

This doc is the contract for how every agent is defined, deployed, observed, and
evolved. It is the **execution plan for CLAUDE.md Phase 8**.

---

## 1. Relationship to CLAUDE.md

This document does not replace CLAUDE.md — it operationalises it. Every rule here
descends from a Golden Rule in CLAUDE.md §Golden Rules and an Architecture Decision
in §Architecture Decisions:

| CLAUDE.md source | AOS enforcement |
|---|---|
| GR#2  RBAC on every route                         | Every agent has an `rbac_scope` in its manifest; orchestrator refuses to dispatch to an agent the caller cannot invoke. |
| GR#3  No direct AI API calls in routes            | Every LLM step goes through `lib/ai-router.ts`. Agents declare `models:` (AITask keys) — they cannot name raw model IDs. |
| GR#4  Additive schema only                        | AOS lives on `AuditLog`, `AutomationLog`, `NotificationLog` (already additive). New per-agent state is a new additive model, never a repurposed column. |
| GR#5  `Promise.allSettled` for multi-channel      | Channel fan-out is the Orchestrator's job, implemented on `lib/events.ts`. Agents emit one intent, the orchestrator dispatches. |
| GR#7  AI-generated outputs visibly disclosed      | Every draft carries a `generated_by` envelope; UI renders the "AI-generated — review before use" badge from this field. |
| GR#8  Attorney-client privilege encryption        | Any agent reading `/vault` documents must call `lib/crypto.ts#decrypt`; agents without the `vault.read` capability never see plaintext. |
| AD#2  Event bus → Promise.allSettled              | AOS is event-driven by default. Direct agent-to-agent calls are a smell. |
| AD#4  All automation logged to `AutomationLog`    | AOS writes one `AutomationLog` row per invocation, plus one `AuditLog` row per material state change. |

If AOS ever appears to conflict with CLAUDE.md, CLAUDE.md wins — open an RFC and amend.

---

## 2. Design principles

1. **Not everything is an agent.** Three things get called "agents" in the draft that are actually different species:
   - **Services** (Legal KB, Orchestrator, HITL gate, Cost Guard) — shared capabilities, always-on, no prompts.
   - **Workflow agents** (Intake, Drafting, Deadline…) — event-triggered, ephemeral, LLM inside.
   - **Surfaces** (Client Portal, Mobile App) — UI, not autonomous. Rendered by a React tree, not a chat loop.

   Mis-labelling these leads to over-engineered agents and under-engineered infrastructure.

2. **Determinism first, LLM last.** If a rule can be written in TypeScript, it goes in TypeScript.
   LLMs are used for: extraction from unstructured text, drafting under templates, classification,
   and narrow summarisation. Never for: eligibility decisions, deadline arithmetic, permission checks,
   routing, payment state. Those are code.

3. **Every agent is a manifest + a function.** No free-form "agent roleplay" — each agent is a
   `manifest.yaml` next to a `run.ts` with a typed input and typed output. The manifest is
   machine-readable; CI validates it.

4. **Human gates are positional, not vibey.** "Lawyer must review" is not an aspiration — it is a
   named gate in the manifest that blocks the pipeline until a `HITLApproval` row exists. If there
   is no gate listed, there is no gate. No implicit gates.

5. **Budgeted autonomy.** Every agent run carries a hard `max_cost_usd` and `max_duration_ms`.
   Exceed them → circuit breaker trips, run is killed, event is logged, human is paged.

6. **Prompts are code.** Prompts are versioned files under `prompts/<agent-id>/v<N>.md`. Prompt
   changes go through PR review. A prompt without a test in `__tests__/agents/` cannot ship.

7. **Agents own intent, not delivery.** The Drafting Agent produces a draft. The Email / WhatsApp /
   Voice agents deliver it. Channel-specific concerns (short-form, disclaimers, consent, quiet hours)
   live in the channel agent, not in the drafter. This is the single biggest deviation from the
   draft plan (which has every channel re-drafting its own copy).

8. **One source of truth per concept.** Case status lives in `Case.overallStatus`. Lead status lives
   in `EligibilityLead.status`. Agents read and write these — they do not mirror them into their
   own stores.

9. **Observability is not optional.** If you can't see it, you can't run it in production. Every
   agent must emit a `runs` row, a cost sample, and an outcome tag (`ok` / `escalated` /
   `circuit_broken` / `human_blocked` / `error`).

10. **Legal safety is a layer, not a reminder.** UPL and outcome-guarantee protection are enforced
    in the Drafting pipeline itself — a linter runs on every LLM output and blocks send on banned
    phrases. Prose "must not promise outcomes" in a KB is necessary but not sufficient.

---

## 3. Taxonomy

Every component below is exactly one of:

| Tier       | Type           | Examples                                                 | LLM inside? | Owns state? | User-facing? |
|------------|----------------|----------------------------------------------------------|-------------|-------------|--------------|
| Service    | rag            | Legal KB                                                 | retrieval   | read-only   | indirect     |
| Service    | orchestrator   | Event Router, HITL Gate, Cost Guard                      | no          | event bus   | no           |
| Workflow   | workflow       | Intake, Eligibility, Documents, Drafting, Deadline, Billing | yes       | writes Case/Lead | indirect |
| Channel    | conversational | Email, WhatsApp, Voice, Internal Messaging               | yes         | writes NotificationLog | yes |
| Surface    | ui             | Client Portal, Mobile App, CRM Dashboard                 | no (render) | no          | yes          |
| Background | cron           | Deadline sweep, Reputation monitor, Analytics/QA         | optional    | writes logs | no           |
| Growth     | workflow       | Social, SEO, AIO/GEO, Reputation                         | yes         | drafts only | indirect     |

Mapping the draft's 20 names to this taxonomy:

| Draft name                    | AOS classification           | Notes |
|-------------------------------|------------------------------|-------|
| Legal Knowledge Agent         | Service · rag                | Not an agent — a RAG service + KB governance. |
| Matter Intake Agent           | Workflow                     | MVP. |
| Eligibility Screening Agent   | Workflow                     | Phase 3 (needs Legal KB). |
| Document & Evidence Agent     | Workflow                     | Phase 3. |
| Drafting Agent                | Workflow                     | MVP. Central writer. |
| Deadline & Compliance Agent   | Workflow + Background (cron) | MVP. |
| Email Agent                   | Channel                      | MVP (outbound only); inbound in phase 2. |
| WhatsApp Agent                | Channel                      | Phase 2. |
| AI Voice Agent                | Channel                      | Phase 2. |
| Client Portal Agent           | Surface                      | Not a chatbot — UI + content map. |
| CRM & Pipeline Agent          | Workflow + Surface           | Split: pipeline rules (workflow) + CRM views (surface). |
| Internal Messaging Agent      | Channel                      | Phase 2. |
| Social Media Agent            | Growth workflow              | Phase 5. |
| SEO Agent                     | Growth workflow              | Phase 5. |
| AIO/GEO Content Agent         | Growth workflow              | Phase 5 — merge with SEO under "Growth Ops". |
| Reputation & Reviews Agent    | Growth workflow + cron       | Phase 5. |
| Mobile App Experience Agent   | Surface                      | Not an agent — a mobile UX spec. |
| Billing & Collections Agent   | Workflow                     | Phase 4. |
| Analytics & QA Agent          | Background cron              | Phase 4 (monitors others). |
| Admin Orchestrator Agent      | Service · orchestrator       | Not an agent — the event router itself. Mostly deterministic TS; LLM only for ambiguous triage. |

Result: **4 services, 9 workflow agents, 4 channel agents, 3 surfaces, 3 background jobs.**
Still 23 units, but only **~9 of them contain LLM decision loops**, and Phase-1 MVP is **5 agents**,
not 20.

---

## 4. The agent manifest contract

Every agent is a directory under `agents/<id>/` with exactly this shape:

```
agents/intake/
├── manifest.yaml          # machine-readable spec (this file is the contract)
├── run.ts                 # typed entry: (input: InputSchema) => Promise<Output>
├── input.schema.ts        # zod schema for the input envelope
├── output.schema.ts       # zod schema for the output envelope
├── prompts/
│   ├── v1.md              # current prompt version
│   └── v1.golden.md       # deterministic fixtures used by tests
└── README.md              # purpose, owner, escalation, change log
```

`manifest.yaml` is validated by `scripts/validate-agents.ts` in CI. Schema:

```yaml
id: intake                              # unique; matches directory name
name: "Matter Intake Agent"
version: 0.1.0                          # semver; bump on prompt or contract change
status: draft | alpha | beta | ga | deprecated
owner: "<github-handle>"                # accountable human, not "the team"
tier: workflow                          # service | workflow | channel | surface | background | growth
type:  workflow                         # rag | orchestrator | workflow | conversational | ui | cron

triggers:                               # event-bus names this agent subscribes to
  - lead.captured
  - intake.submitted

emits:                                  # events this agent may publish (declared = allowed)
  - case.created
  - notification.dispatch
  - hitl.requested

tools_allowed:                          # hard allowlist (anything else throws in run.ts wrapper)
  - lib/ai-router:routeAI
  - lib/events:dispatch
  - lib/audit:logAuditEvent
  - lib/notifications:notify
  - prisma:Case.create
  - prisma:EligibilityLead.update
  - prisma:AuditLog.create

models:                                 # AITask keys from lib/ai-router.ts ROUTING_TABLE
  - eligibility-score
  - form-prefill

rbac_scope:                             # which roles may invoke this agent directly
  invoker: [LVJ_ADMIN, LVJ_TEAM, LAWYER_ADMIN, LAWYER_ASSOCIATE]
  acts_on_behalf_of: [CLIENT, LVJ_TEAM] # whose data it may read/write
vault_access: false                     # true requires lib/crypto decrypt capability

prisma_writes:                          # hard allowlist of tables it may write
  - EligibilityLead
  - Case
  - AuditLog

human_gates:                            # HITL checkpoints in execution order
  - id: before_case_creation
    rule: "If eligibility_score < 0.6 OR risk_flags != [] OR answers.prior_refusal == true"
    approver_role: LAWYER_ADMIN
    sla_hours: 4
  - id: before_engagement_letter
    rule: "always"
    approver_role: LAWYER_ADMIN
    sla_hours: 24

budgets:
  max_cost_usd: 0.25                    # per run; includes all LLM calls
  max_duration_ms: 45000                # wall-clock ceiling
  max_llm_calls: 6

escalation_triggers:                    # structured events — emit, don't prose
  - criminal_history_disclosed
  - prior_refusal_disclosed
  - urgent_deadline_within_14d
  - inconsistent_identity_data
  - distressed_client_signal

kpis:                                   # measurable; tracked by Analytics/QA
  - name: lead_to_case_conversion_rate
    target: "> 0.35"
  - name: intake_completeness_pct
    target: "> 0.90"
  - name: time_to_first_human_touch_minutes
    target: "< 60"
  - name: hallucination_rate_per_100_runs
    target: "< 0.5"

kb:                                     # knowledge base binding
  core: skills/core/SKILL.md
  agent: skills/intake/SKILL.md

feature_flag: AGENT_INTAKE_ENABLED      # must exist in env; default false in prod
```

Five things this contract forces:

1. **Tool allowlist is hard.** The `run.ts` wrapper (`lib/agents/invoke.ts`, to be built) proxies
   every call and rejects anything not in `tools_allowed`. A "drafting agent" cannot accidentally
   call `prisma.case.delete`.
2. **Model routing is explicit.** `models:` lists AITask keys — the router picks the provider. An
   agent cannot hardcode `gpt-5` and break the fallback contract.
3. **RBAC is dual.** `invoker` (who can trigger me) and `acts_on_behalf_of` (whose data I touch)
   are separate fields. An LVJ_MARKETING user may invoke Social but cannot invoke Intake even
   though both write to the DB.
4. **HITL gates are positional.** The orchestrator reads `human_gates[]`, creates a
   `HITLApproval` row when rule matches, and blocks downstream events until the row is approved.
   No gate = no block.
5. **Budget is enforced, not requested.** The invoke wrapper carries a cost accumulator;
   exceeding `max_cost_usd` short-circuits with `CostExceeded`, logs to `AutomationLog`, and
   emits `agent.circuit_broken`.

---

## 5. Runtime architecture

```
           ┌───────────────────────────────────────────────────────┐
           │                    Application                        │
           │  (API routes, cron handlers, webhooks, UI actions)    │
           └───────────────┬───────────────────────────────────────┘
                           │ dispatch(event)
                           ▼
                 ┌─────────────────────┐
                 │   Event Bus         │   lib/events.ts
                 │   Promise.allSettled│   (GR#5, AD#2)
                 └──────────┬──────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │   Orchestrator Service │   lib/agents/orchestrator.ts
                │   · RBAC check          │
                │   · Feature flag check  │
                │   · Cost budget open    │
                │   · HITL gate resolve   │
                │   · Circuit breaker     │
                └──────────┬─────────────┘
                           │ invoke(agent, input)
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │              Agent Runtime (invoke wrapper)          │
    │  lib/agents/invoke.ts                                │
    │  · tool allowlist proxy                              │
    │  · per-call audit + cost sampling                    │
    │  · escalation event plumbing                         │
    │  · timeout + retry policy                            │
    └────┬──────────────────┬──────────────────┬───────────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌──────────┐       ┌──────────┐       ┌──────────┐
   │ Intake   │       │ Drafting │  ...  │ Deadline │
   │ agent    │       │ agent    │       │ agent    │
   └────┬─────┘       └────┬─────┘       └────┬─────┘
        │                  │                  │
        ▼                  ▼                  ▼
   ┌──────────────────────────────────────────────────────┐
   │  Shared tools (the only things agents may call)      │
   │  · lib/ai-router.ts         (LLM, GR#3)              │
   │  · lib/notifications.ts     (channel dispatch)       │
   │  · lib/audit.ts             (AuditLog)               │
   │  · lib/crypto.ts            (vault docs, GR#8)       │
   │  · lib/rbac.ts              (guards)                 │
   │  · prisma.<model>.<verb>    (whitelisted per agent)  │
   │  · services/legal-kb        (RAG retrieve only)      │
   └──────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌────────────────────────┐
                │  Persistence & logs    │
                │  · AuditLog             │
                │  · AutomationLog        │
                │  · NotificationLog      │
                │  · per-agent tables     │
                └────────────────────────┘
```

Key runtime decisions:

- **Single entry point.** Every agent is invoked via `invoke(agentId, event)`. There is no other
  way to run an agent. If a code path tries, the linter (`scripts/lint-agents.ts`) blocks CI.
- **Correlation ID propagates.** Every event carries `correlation_id`; the invoke wrapper
  injects it into the audit row, the ai-router call, and any emitted event. Tracing a single
  client intake through Drafting → Email → HITL approval → delivery becomes one DB query.
- **Events are the *only* inter-agent channel.** Agent A does not import agent B. It emits an
  event B listens to. This keeps dependency graphs acyclic.
- **Orchestrator is mostly boring TypeScript.** Routing rules are deterministic: event name →
  list of subscribers. The only LLM call the orchestrator may make is an optional classifier
  for ambiguous inbound messages ("is this from a client or a lead?") — disabled by default.
- **Background jobs use the same runtime.** Cron handlers (Vercel Cron) emit synthetic events
  (`cron.daily.deadline_sweep`) — they are not a parallel code path.

---

## 6. Knowledge Base framework

### 6.1 Physical layout

KB content lives under `skills/` (CLAUDE.md already reserves this path). One directory per
domain; every agent binds to **exactly one** agent-KB plus the **Core KB**.

```
skills/
├── core/
│   ├── SKILL.md                    # firm identity, roles, disclaimers, escalation matrix
│   ├── tone/legal-formal.md
│   ├── tone/empathetic-client.md
│   ├── tone/internal-ops.md
│   ├── disclaimers/upl.md          # unauthorized-practice-of-law guardrails
│   ├── disclaimers/outcome.md      # no-outcome-guarantee language
│   ├── privacy/consent.md
│   ├── privacy/retention.md
│   └── escalation/matrix.md
├── intake/
│   ├── SKILL.md
│   ├── questionnaires/eb5.md
│   ├── questionnaires/o1.md
│   └── routing-rules.md
├── drafting/
│   ├── SKILL.md
│   ├── templates/retainer-follow-up.md
│   ├── templates/document-request.md
│   ├── banned-phrases.md           # hard list; enforced by output linter
│   └── clause-library.md
├── deadline/…
├── legal-kb/                        # the RAG service corpus
│   ├── SKILL.md
│   ├── visa-types/
│   ├── jurisdictions/
│   ├── memos/
│   └── index.json                   # retrieval index (built from front-matter)
└── growth/ …
```

### 6.2 Article format

Every KB file is markdown with mandatory YAML front-matter:

```yaml
---
id: core.disclaimer.outcome                 # globally unique
owner: "<github-handle>"                    # single accountable human
jurisdiction: US | GLOBAL | MENA | BR | EU  # or a list
service_lines: [EB5, O1, N400, …, "*"]      # "*" = all
audience: [lawyer, staff, client, public]
tone: legal-formal | empathetic-client | internal-ops | marketing
confidence: authoritative | reviewed | draft | experimental
source_type: lawyer_memo | uscis_policy | firm_policy | internal_observation
reviewed_by: "<github-handle>"
reviewed_at: 2026-04-22
review_ttl_days: 90                         # shorter for legal, longer for brand
supersedes: []                              # array of article ids
superseded_by: null
privileged: false                           # true = attorney-client; agents need vault.read
---

# Title

Body markdown…
```

CI (`scripts/validate-kb.ts`) rejects any article missing front-matter, with an expired
`reviewed_at + review_ttl_days`, or with a cycle in `supersedes` / `superseded_by`.

### 6.3 Retrieval contract

Agents do not `fs.readFile` KB articles directly. They call one of:

- `legalKb.retrieve(query, { jurisdiction, service_line, audience, confidence: "authoritative" })`
  for RAG. Returns ranked chunks with source citations.
- `kb.get(id)` for exact-article lookup.

Both enforce: `confidence == 'authoritative'` for anything flowing into client-facing output;
`privileged == true` is filtered unless the caller presents a `vault.read` capability.

### 6.4 Governance

- **Change control.** KB edits are PRs. Front-matter diff must show a new `reviewed_at` and a
  bumped `reviewed_by`. No self-review for `source_type == lawyer_memo`.
- **Staleness.** Weekly cron (`skills/scripts/staleness-sweep.ts`) opens a GitHub issue listing
  articles past `review_ttl_days`. Articles past 2× TTL are auto-flipped to `confidence: draft`
  — agents stop serving them as authoritative.
- **Validated precedent.** When a lawyer edits an agent-generated draft and approves it, the
  orchestrator diffs the draft vs the approved version. High-value deltas (measured by
  `edit_distance / output_length > 0.25`) surface as "candidate KB updates" in a weekly
  human-reviewed queue. Nothing auto-merges into the KB.
- **No silent policy rewrites.** An agent emitting a new disclaimer pattern, new banned phrase,
  or new escalation trigger *must* open a PR. The orchestrator will refuse to run with a KB
  that has a `WIP` or `PROPOSED` article marked `confidence: authoritative`.

### 6.5 Core KB contents (v0.1 scope)

The Core KB must land before any workflow agent ships. Minimum set:

1. `core/identity.md` — firm name, offices, service lines, working hours.
2. `core/roles.md` — the 7-role matrix (mirrors `lib/rbac.ts`).
3. `core/case-lifecycle.md` — canonical case statuses, stage transitions, terminal states.
4. `core/escalation/matrix.md` — events → role → SLA → channel.
5. `core/disclaimers/upl.md` — banned phrases, required phrasings.
6. `core/disclaimers/outcome.md` — no outcome guarantees, hedging language, approved phrasings.
7. `core/privacy/consent.md` — WhatsApp / SMS / voice / email / recording consent templates.
8. `core/privacy/retention.md` — per-data-class retention windows.
9. `core/tone/*.md` — four tone guides.
10. `core/languages.md` — **EN only v0.1**; AR/PT deferred (matches CLAUDE.md §Product Identity).

---

## 7. Agent roster

Three exemplars fully fleshed out, then the rest as a dense table. The exemplars are the
Phase-1 MVP (§11): an engineer can start building from these alone.

### 7.1 Intake — `agents/intake/`

**Mission.** Convert an `EligibilityLead` (or a public form submission) into a reviewable
matter draft: structured answers, initial service-type classification, a first
document-request list, and a summary for the assigned counsel. Never creates the `Case`
row itself — always flows through a HITL gate.

**Triggers.** `lead.captured`, `intake.submitted`.
**Emits.** `intake.draft_ready`, `hitl.requested`, `notification.dispatch`, `case.created`
(only after HITL approval), `escalation.raised`.

**Inputs (zod).**
```ts
{
  leadId: string,
  answers: Record<string, unknown>,
  attachments: Array<{ gcsKey: string; mime: string; label: string }>,
  locale: "en",               // v0.1 EN only
  source?: string,            // utm_source
}
```

**Outputs.**
```ts
{
  leadId: string,
  classification: {
    serviceTypeCode: string,          // e.g. "EB5", "O1", or "UNKNOWN"
    confidence: number,               // 0..1
    alternatives: Array<{ code: string; confidence: number }>,
  },
  eligibilityScore: number,           // 0..1 — used only by human reviewers, never shown to client
  missingFacts: string[],
  riskFlags: string[],                // matches escalation_triggers
  documentRequestList: string[],      // required-document codes from skills/intake/
  summaryForCounsel: string,          // markdown, ≤ 400 words
  disclaimer: "AI-generated — preliminary triage only, not legal advice."
}
```

**Models used.** `eligibility-score`, `form-prefill`. (Keys from `lib/ai-router.ts#ROUTING_TABLE`.)

**HITL gates.**
1. `before_case_creation` — triggers if `eligibilityScore < 0.6` OR `riskFlags.length > 0` OR
   any of the criminal/prior-refusal answers is true. Approver: `LAWYER_ADMIN`, 4h SLA.
   On approval: orchestrator allows `case.created` event; on rejection: lead status flipped
   to `ARCHIVED` with audit note; on SLA miss: pages the on-call partner.
2. `before_engagement_letter` — always. No engagement letter leaves the firm without a
   human "send" action. Drafting Agent may *prepare* it, Intake cannot *send* it.

**Prisma writes.** `EligibilityLead` (status, score, riskFlags); `Case` (only post-HITL);
`AuditLog`. Never writes `Payment`, `Document`, or `User`.

**KPIs.** `lead_to_case_conversion_rate > 0.35`, `intake_completeness_pct > 0.90`,
`time_to_first_human_touch_minutes < 60`, `hallucination_rate_per_100_runs < 0.5`.

**Known failure modes & mitigations.**
- *Over-classification.* If `confidence < 0.75`, return `serviceTypeCode = "UNKNOWN"` and
  escalate rather than guess.
- *Attachment hallucination.* Attachments are summarised by `ocr-document` only after
  `lib/crypto` scope check; raw passport numbers are redacted from the summary
  (`scripts/pii-scrub.ts`).
- *Lead duplicate.* If `(email, phone)` matches an existing lead or case within 180 days,
  emit `intake.duplicate_detected` and halt.

---

### 7.2 Drafting — `agents/drafting/`

**Mission.** Produce reviewable first drafts of client-facing written artefacts (emails,
letters, WhatsApp messages, portal banners, RFE response skeletons, intake summaries).
Every output is a template instantiation under lawyer-reviewed clause libraries —
*never* freeform.

**Triggers.** `drafting.request` (synchronous, from other agents or staff actions).
**Emits.** `drafting.draft_ready`, `drafting.banned_phrase_blocked`, `hitl.requested`.

**Inputs.**
```ts
{
  caseId?: string,
  leadId?: string,
  templateId: string,                 // required; references skills/drafting/templates/*
  channel: "email" | "whatsapp" | "portal" | "letter" | "internal",
  variables: Record<string, string>,  // matter-aware injection
  locale: "en",
  requestedBy: string,                // userId — stored on the draft
}
```

**Outputs.**
```ts
{
  draftId: string,
  templateId: string,
  channel: string,
  body: string,                       // plain / markdown per channel
  subject?: string,
  disclaimer: string,                 // auto-attached from core/disclaimers/
  reviewState: "draft",               // drafting never produces "approved"
  generatedBy: {
    agent: "drafting",
    version: "0.1.0",
    model: string,
    promptVersion: "v1",
    tokensUsed: number,
    costUsd: number,
  },
  guardrailReport: {
    banned_phrases_hits: string[],
    outcome_guarantee_hits: string[],
    upl_risk: "none" | "low" | "review_required",
  }
}
```

**Models used.** `rfe-draft`, `email-draft`, `social-copy`, `legal-analysis` (for structural
summaries only, never for advice generation). Channel-specific length caps live in
`skills/drafting/channel-rules.md`.

**Guardrail pipeline (the crucial bit).**
Every draft passes through `lib/agents/guardrails.ts` *after* the LLM, *before* it leaves
the agent:

1. **Banned-phrase linter.** Regex set from `skills/drafting/banned-phrases.md`. Hits →
   either auto-redacted (low severity) or output rejected (high severity).
2. **Outcome-guarantee scanner.** Structured patterns: "will be approved", "you will get",
   "guaranteed", "100%", "should not fail". Any hit → rejected, `hitl.requested` emitted.
3. **UPL scanner.** Detects legal advice outside approved templates (heuristic + LLM
   classifier on the next call, `deadline-check` model). `upl_risk == "review_required"`
   blocks send until a lawyer approves.
4. **PII leak check.** Ensures passport numbers / DOBs / SSNs outside the approved template
   slots are redacted. Never logs raw PII.
5. **Tone check.** Channel tone must match `core/tone/<tone>.md` — small model pass.

A draft that fails any hard gate is **never sent**. It surfaces in the HITL queue with the
full `guardrailReport`.

**HITL gates.** None *inside* Drafting — Drafting always produces `reviewState: "draft"`.
HITL happens at the channel agent (Email/WhatsApp/Voice) before delivery, OR upstream in
the workflow agent that requested the draft.

**Prisma writes.** `AuditLog` (one row per draft). Drafts themselves are stored in a new
additive `AgentDraft` model (Phase 1 migration — see §11).

**KPIs.** `draft_acceptance_rate > 0.80`, `avg_edit_distance < 0.20`,
`banned_phrase_incidents_per_1000 < 1`, `upl_review_rate < 0.10`.

---

### 7.3 Deadline — `agents/deadline/`

**Mission.** Keep every matter's deadline clock correct; fire reminders through the right
channel at the right time; escalate to a human when silence risks malpractice exposure.
Mostly deterministic — the LLM is used only to interpret USCIS policy-note text when a new
deadline type lands.

**Triggers.** `cron.daily.deadline_sweep` (00:05 UTC), `case.status_changed`,
`case.document_uploaded`, `deadline.manual`.
**Emits.** `notification.dispatch`, `deadline.approaching`, `deadline.missed`,
`escalation.raised`, `hitl.requested`.

**Inputs (for event-triggered runs).**
```ts
{
  caseId?: string,                    // undefined for sweep runs
  trigger: "cron" | "event" | "manual",
  sweepDate?: string,                 // ISO date, cron only
}
```

**Outputs.**
```ts
{
  deadlinesEvaluated: number,
  remindersQueued: number,
  escalationsRaised: number,
  circuitBrokenFor: string[],         // caseIds where a cost/time budget was hit
}
```

**Models used.** `deadline-check` (only when a new USCIS policy-note URL is attached to a
case and needs interpretation). The core arithmetic is plain TypeScript in
`lib/deadline-engine.ts` — CLAUDE.md §Project Structure already reserves this file.

**Reminder cadence (from `skills/deadline/cadence.md`).**
- T-14d: in-app + email.
- T-7d: + WhatsApp if consent.
- T-3d: + voice call attempt if consent AND document not yet uploaded.
- T-24h: partner pager; lead counsel pager; `escalation.raised`.
- T+0 missed: `hitl.requested` (partner, 1h SLA), `deadline.missed` logged.

**Quiet-hours and consent.** Reminders between 21:00–08:00 client local time are queued
to the next morning window except for *pager* escalations. Consent flags live on
`Case.clientConsent` (additive field, see §11).

**HITL gates.**
- `missed_deadline_human_review` — always on `deadline.missed`, partner approver, 1h SLA.
- `novel_deadline_interpretation` — when the LLM `deadline-check` call was used, human
  must confirm the interpretation before any auto-reminders fire.

**Prisma writes.** `NotificationLog`, `AuditLog`. New additive `CaseDeadline` model
(Phase 1 migration, §11).

**KPIs.** `missed_deadlines_per_100_cases < 0.2`, `reminder_delivery_rate > 0.98`,
`escalation_to_partner_mean_minutes < 30`, `quiet_hours_violations == 0`.

---

### 7.4 Compact roster for the remaining 20 units

| # | ID                | Tier / Type         | Phase | Triggers (events)                               | Models (AITask)                   | Writes (Prisma)                        | Primary HITL gates                          |
|---|-------------------|---------------------|-------|-------------------------------------------------|-----------------------------------|----------------------------------------|---------------------------------------------|
| 4 | legal-kb          | Service / rag       | 2     | (pull) `legalKb.retrieve()`                      | —                                 | — (read-only)                          | PR review on `confidence: authoritative`    |
| 5 | orchestrator      | Service / router    | 1     | all events                                       | `batch-analysis` (optional)       | `AuditLog`, `AutomationLog`            | none (routes *to* gates)                    |
| 6 | hitl-gate         | Service             | 1     | `hitl.requested`                                 | —                                 | `HITLApproval` (new additive)          | itself                                      |
| 7 | cost-guard        | Service             | 1     | wraps every LLM call                             | —                                 | `AutomationLog` cost column            | none                                        |
| 8 | eligibility       | Workflow            | 3     | `intake.draft_ready`, `lead.reopened`            | `eligibility-score`, `legal-analysis` | `EligibilityLead` (score fields)    | `before_client_disclosure`                  |
| 9 | documents         | Workflow            | 3     | `case.document_uploaded`, cron daily             | `ocr-document`, `ocr-passport`    | `Document`, `AuditLog`                 | `legal_sufficiency_review` (lawyer)         |
|10 | billing           | Workflow            | 4     | `payment.received`, `payment.overdue`, cron      | `email-draft`                     | `Payment`, `NotificationLog`           | `dispute_handoff`, `refund_approval`        |
|11 | email             | Channel             | 1     | `notification.dispatch` where channel=EMAIL      | —                                 | `NotificationLog`                      | `send_to_client_high_risk`                  |
|12 | whatsapp          | Channel             | 2     | `notification.dispatch` where channel=WHATSAPP   | —                                 | `NotificationLog`                      | `legal_nuance_flagged`                      |
|13 | voice             | Channel             | 2     | `notification.dispatch` where channel=VOICE      | —                                 | `VoiceCallLog`, `NotificationLog`      | `distress_detected`, `low_confidence_language` |
|14 | internal-msg      | Channel             | 2     | `escalation.raised`, `hitl.requested`            | —                                 | `NotificationLog`                      | none (staff-only)                           |
|15 | client-portal     | Surface             | 2     | (render) case props                              | —                                 | —                                      | data redaction rules (read-only)            |
|16 | mobile-ux         | Surface             | 3     | (render)                                         | —                                 | —                                      | as client-portal                            |
|17 | crm-pipeline      | Workflow + Surface  | 4     | `lead.captured`, `lead.stage_changed`, cron      | `batch-analysis`                  | `EligibilityLead`, `Partner` counters  | `reassignment_without_consent`              |
|18 | social            | Growth workflow     | 5     | staff action, `case.approved` (opt-in)           | `social-copy`                     | `SocialPost` (new, Phase 5)            | `publish_approval`, `consent_check`         |
|19 | seo-aio           | Growth workflow     | 5     | cron weekly                                      | `social-copy`, `legal-analysis`   | `ContentBrief` (new, Phase 5)          | `legal_content_review`                      |
|20 | reputation        | Growth workflow + cron | 5  | `case.approved`, cron daily                      | `email-draft`                     | `ReviewRequest` (new, Phase 5)         | `negative_feedback_handoff`                 |
|21 | analytics-qa      | Background cron     | 4     | cron hourly, cron daily                          | `legal-analysis` (sampling only)  | `AgentQASample` (new, Phase 4)         | none (observer)                             |

Every row will eventually have a full manifest file. We land the three exemplars (Intake,
Drafting, Deadline) + the four services (Orchestrator, HITL Gate, Cost Guard, Legal KB)
in Phase 1; the rest follow the phased plan in §11.

---

## 8. Cross-cutting legal safety layer

Because LVJ practises immigration law, every client-facing agent output — email,
WhatsApp, voice TTS, portal banner, social post — sits in the same liability zone.
We enforce one safety layer everywhere, not bespoke rules per channel.

### 8.1 Universal rules (enforced by `lib/agents/guardrails.ts`)

1. **Information vs. advice.** Every output carries an `advice_class` tag:
   `general_information` | `firm_process` | `attorney_approved_advice`. Only
   `attorney_approved_advice` may leave the firm without a HITL approval — and that
   classification can only be set by a human lawyer approving the draft.

2. **No outcome guarantees.** Banned forms (case-insensitive, word-boundary):
   `"will be approved"`, `"guaranteed"`, `"100%"`, `"certain to"`, `"definitely get"`,
   `"no risk"`, `"will succeed"`. Detector blocks send. Approved hedging in
   `skills/core/disclaimers/outcome.md`.

3. **No UPL.** No out-of-jurisdiction legal conclusions. No representations on matters
   outside the firm's service lines. Detector: service-line allow list per template;
   jurisdiction classifier for any output referencing a country outside the firm's
   roster.

4. **Consent-aware channels.** Outbound WhatsApp / SMS / voice are blocked unless
   `Case.clientConsent.<channel> == true`. Email consent is implied by intake submission
   but unsubscribe is respected.

5. **Role-limited disclosure.** An agent operating "on behalf of" a CLIENT role cannot
   expose internal notes, strategy memos, or `privileged: true` KB chunks in outputs.
   Enforced by `acts_on_behalf_of` × KB retrieval filter.

6. **Audit by default.** Every material communication (any `NotificationLog` write, any
   `Case` state transition) ⇒ `AuditLog` row with correlation id, agent id, prompt
   version, model id, approval chain.

7. **Retention.** Drafts unused for 90d auto-deleted. Voice transcripts retained per
   `core/privacy/retention.md`. Deletion is logged.

### 8.2 Structured escalation events

The draft's prose list ("must escalate if criminal history …") becomes a typed event
surface — any agent may emit one of these and the orchestrator knows what to do:

| Event                               | Routed to                        | Pauses    | SLA   |
|-------------------------------------|----------------------------------|-----------|-------|
| `escalation.criminal_history`        | LAWYER_ADMIN                    | intake    | 2h    |
| `escalation.prior_refusal`           | LAWYER_ADMIN                    | intake    | 4h    |
| `escalation.urgent_deadline`         | LAWYER_ADMIN + partner pager    | all auto  | 30m   |
| `escalation.adverse_notice`          | LAWYER_ADMIN                    | all auto  | 30m   |
| `escalation.distressed_client`       | on-call counsel                 | voice+wa  | 15m   |
| `escalation.fraud_indicator`         | LAWYER_ADMIN + compliance       | all auto  | 2h    |
| `escalation.fee_dispute`             | billing + LAWYER_ADMIN          | billing   | 24h   |
| `escalation.inconsistent_identity`   | intake reviewer                 | intake    | 4h    |

"Pauses" means the orchestrator sets a per-case `autoPauseUntil` flag — no further
automated outbound comms on that case until the pause is cleared by a human.

---

## 9. Observability, budgets, circuit breakers

### 9.1 What we log, per agent invocation

Two rows are written, no exceptions:

1. **`AutomationLog`** (one row per invoke):
   `id, agentId, agentVersion, correlationId, triggerEvent, caseId?, leadId?, startedAt,
   durationMs, status (ok|escalated|human_blocked|circuit_broken|error), costUsd,
   tokensIn, tokensOut, llmCalls, promptVersion, modelPrimary, modelFallbackUsed,
   escalationEvent?, errorClass?, errorMessage?`.

2. **`AuditLog`** (one row per material state change emitted by the agent): already
   defined in the Sprint 0 schema — augmented `diff` carries
   `{ agent, version, correlationId }`.

`AutomationLog` is a new additive model (§11 migration). `AuditLog` already exists.

### 9.2 Budgets

Declared per-agent in `manifest.yaml`. Enforced by `lib/agents/cost-guard.ts`:

- `max_cost_usd` — per run. `ai-router.ts` cost accumulator is wired through; each call
  updates a `RunBudget` context. Exceeding raises `CostExceeded`.
- `max_duration_ms` — wall-clock; enforced by `AbortController`.
- `max_llm_calls` — hard call counter.

Cross-firm budgets live in env: `AOS_DAILY_BUDGET_USD`, enforced by Cost Guard service
across all agents. Overrun → all non-critical agents pause until next UTC midnight;
deadline / escalation agents keep running.

### 9.3 Circuit breakers

Per-agent error-rate circuit breaker (`lib/agents/breaker.ts`):

- Rolling 5-minute window. If `error_rate > 0.20` across ≥ 10 samples → breaker opens,
  agent disabled for 10 min, pager fired, `ops_incident.opened` event emitted.
- Per-provider circuit in `ai-router.ts` already proposed (fallback chain) — AOS breaker
  sits one layer above.

### 9.4 Metrics & dashboards (Analytics/QA agent)

Daily rollups into a new `AgentQASample` model (Phase 4):
- cost per agent, cost per case, cost per channel
- p50 / p95 duration per agent
- escalation rate, HITL approval rate, HITL timeout rate
- banned-phrase incidents, UPL flags
- `hallucination_rate_per_100_runs` (sampled human rating of agent outputs)

Admin surface: `/admin/automation` reads from these — Phase 4.

### 9.5 Regression harness

`__tests__/agents/<id>.golden.test.ts` runs the agent against `v1.golden.md` fixtures:
- asserts structural output matches schema
- asserts no banned phrases / outcome guarantees
- asserts cost < 1.5× baseline
- CI blocks merge on regression

Prompt version bump (v1 → v2) is only permitted with a refreshed golden set and a
green regression run.

---

## 10. Human-in-the-loop gates

HITL is a first-class primitive, not an ad-hoc checklist.

### 10.1 Data model

New additive model (`HITLApproval`, Phase 1 migration):

```prisma
model HITLApproval {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  agentId       String                    // e.g. "intake"
  gateId        String                    // e.g. "before_case_creation"
  correlationId String                    // ties to AutomationLog / AuditLog
  caseId        String?
  leadId        String?
  payload       Json                       // the draft / decision being approved
  approverRole  String                     // e.g. "LAWYER_ADMIN"
  requestedAt   DateTime @default(now())
  slaDueAt      DateTime
  status        HITLStatus  @default(PENDING)   // PENDING | APPROVED | REJECTED | EXPIRED
  decidedBy     String?                    // userId
  decidedAt     DateTime?
  reason        String?                    // rejection rationale
  diff          Json?                      // approved-version vs draft diff (for KB feedback)
}
enum HITLStatus { PENDING APPROVED REJECTED EXPIRED }
```

### 10.2 Protocol

1. Agent emits `hitl.requested` with the gate id. Orchestrator inserts the
   `HITLApproval` row and does **not** propagate downstream events tagged
   `{ blocked_by_gate: <gateId> }` until the row moves to `APPROVED`.
2. Approver UI lives at `/admin/approvals` (Phase 1). Approvers see a live queue with
   diff, risk flags, SLA countdown.
3. On `APPROVED`: orchestrator releases blocked events, tags the downstream run with
   `approved_by` + `approved_at`, writes a KB candidate (diff ≥ threshold).
4. On `REJECTED`: downstream events cancelled, `agent.run_cancelled` emitted, lead/case
   marked accordingly, reason stored.
5. On `EXPIRED` (SLA miss): paging escalation + `hitl.expired` event. For deadline /
   adverse-notice gates this auto-escalates to partner pager.

### 10.3 Gate taxonomy

Gates declared across agents fall into five families (useful for the approvals UI):

- **Client disclosure** — anything that would be seen by the client.
- **External send** — email / WhatsApp / voice dispatch.
- **Legal conclusion** — eligibility results, RFE responses, engagement letters.
- **Financial** — invoice send, refund, discount.
- **Public publishing** — social posts, website content.

Each family has a default approver role table in `skills/core/escalation/matrix.md`.

---

## 11. Phased rollout

The draft's "first build order" is right in spirit but too wide for a real MVP. Below
is the version we can actually ship, with explicit done-criteria per phase.

### Phase 1 — Operational Spine (3 sprints)

**Goal.** Prove the AOS runtime works end-to-end on one small loop:
`public intake form → Intake Agent → Drafting Agent (welcome email) → HITL approval →
Email Agent → NotificationLog`. Every ceremony below ships; everything else is stubs.

Ships:
- `lib/agents/invoke.ts`, `lib/agents/orchestrator.ts`, `lib/agents/cost-guard.ts`,
  `lib/agents/breaker.ts`, `lib/agents/guardrails.ts`
- Agents: `intake`, `drafting`, `email` (outbound only); services:
  `orchestrator`, `hitl-gate`, `cost-guard`, `legal-kb` (minimal corpus)
- Additive Prisma: `AgentDraft`, `AutomationLog`, `HITLApproval`, `CaseDeadline`
- Core KB bootstrap (§6.5 items 1–10)
- `/admin/approvals` Phase 1 UI
- `scripts/validate-agents.ts`, `scripts/validate-kb.ts`, `scripts/lint-agents.ts` in CI
- Golden-set regression harness

Done when:
1. Submitting a test lead creates an `EligibilityLead`, triggers Intake, generates a
   draft welcome email, blocks at HITL, and sends only after approval.
2. `AutomationLog` has one row per invoke; `AuditLog` shows the approval chain.
3. Guardrail tests pass; banned-phrase injection is blocked.
4. Cost-guard trips on a forced 20× cost injection.
5. Circuit breaker opens on a forced provider failure.

### Phase 2 — Multi-channel + legal depth (2 sprints)

Ships:
- Agents: `whatsapp`, `voice`, `internal-msg`, `deadline` (full), `legal-kb` (full RAG)
- Consent model: `Case.clientConsent { email, sms, whatsapp, voice, recording }`
- Quiet-hours engine in Orchestrator
- `skills/legal-kb/` content pipeline (lawyer-only PRs)

Done when:
- A case transitioning to `documents_pending` sends reminders across enabled channels
  in the right sequence without HITL for standard cadences.
- Voice attempts call only when consent AND text channels have been tried.
- Legal KB retrieval returns citation metadata; agents refuse to cite non-authoritative
  chunks in client-facing output.

### Phase 3 — Intelligence & docs (2 sprints)

Ships: `eligibility`, `documents`, `client-portal` (surface hookup), `mobile-ux`
(Capacitor wrapper content map).

Done when: a completed intake produces an eligibility memo reviewed by a lawyer;
document uploads auto-classify and flag missing items; client-portal shows approved
status text only (no internal notes).

### Phase 4 — Revenue & observability (2 sprints)

Ships: `billing`, `crm-pipeline`, `analytics-qa`, `/admin/automation` dashboard,
weekly KB feedback loop (human-reviewed).

Done when: invoice reminder cadence runs; pipeline KPIs per office and source are
live; Analytics/QA flags top-5 agent issues weekly with a human-review queue.

### Phase 5 — Growth ops (2 sprints)

Ships: `social`, `seo-aio`, `reputation`. All behind publish-approval gates. No growth
agent may publish publicly without an explicit human click.

### Cross-phase: never-ship list

These will not be implemented in v1, on purpose:
- Autonomous legal-conclusion generation (even with "high confidence").
- Client-facing chatbot that holds open conversation (only scripted flows + handoff).
- Cross-jurisdiction legal synthesis.
- Auto-refund without human approval.
- Auto-publish public content.

---

## 12. Directory & file conventions

```
AssistantAPP-main/
├── agents/
│   ├── intake/
│   ├── drafting/
│   ├── deadline/
│   └── …                              # one dir per agent, manifest + run.ts
├── lib/
│   ├── agents/                        # the runtime (invoke, orchestrator, guards)
│   │   ├── invoke.ts
│   │   ├── orchestrator.ts
│   │   ├── cost-guard.ts
│   │   ├── breaker.ts
│   │   ├── guardrails.ts
│   │   └── hitl.ts
│   ├── ai-router.ts                   # (Sprint 0)
│   ├── events.ts                      # (Sprint 0)
│   ├── audit.ts                       # (Sprint 0)
│   ├── crypto.ts                      # (Sprint 0)
│   ├── rbac.ts                        # (Sprint 0)
│   └── deadline-engine.ts             # Phase 1
├── skills/
│   ├── core/…                         # Core KB
│   ├── intake/SKILL.md
│   ├── drafting/SKILL.md
│   ├── deadline/SKILL.md
│   └── legal-kb/…                     # RAG corpus
├── prompts/
│   └── <agent-id>/v<N>.md             # versioned prompt artefacts
├── scripts/
│   ├── validate-agents.ts             # CI: manifest schema
│   ├── validate-kb.ts                 # CI: front-matter + TTL
│   ├── lint-agents.ts                 # CI: enforce invoke entry
│   └── staleness-sweep.ts             # cron: open issues for stale KB
├── __tests__/
│   └── agents/
│       ├── intake.golden.test.ts
│       ├── drafting.golden.test.ts
│       └── deadline.golden.test.ts
└── docs/
    ├── AGENT_OS.md                    # this file
    └── AGENT_OS_CHANGELOG.md          # rolling log of contract changes
```

Naming rules:
- Agent IDs: kebab-case, matches directory and manifest id.
- Events: `domain.action` past tense (`case.created`, `intake.draft_ready`).
- Prompts: `v<N>.md` where N is an integer; never rewrite a published prompt in place.
- KB article IDs: dot-namespaced (`core.disclaimer.outcome`).

---

## 13. Definition of Done per agent

An agent moves from `draft` → `alpha` → `beta` → `ga` only when every box is ticked.

- [ ] `agents/<id>/manifest.yaml` validates in CI.
- [ ] `run.ts` uses only tools in `tools_allowed`; lint check passes.
- [ ] `input.schema.ts` + `output.schema.ts` are zod schemas; runtime validates both.
- [ ] Prompt file `prompts/<id>/v<N>.md` exists and is referenced by manifest.
- [ ] Golden fixture `prompts/<id>/v<N>.golden.md` exists.
- [ ] `__tests__/agents/<id>.golden.test.ts` passes; covers: schema, guardrails,
      escalation events, budget, RBAC rejection.
- [ ] KB binding: `skills/<id>/SKILL.md` exists; linked in manifest.
- [ ] HITL gates wired in Orchestrator; approver UI renders the payload.
- [ ] Budgets configured and exercised by a cost-injection test.
- [ ] Feature flag defaults to `false` in prod; enabled per-office via admin UI.
- [ ] Owner has signed off in `agents/<id>/README.md`.
- [ ] Runbook entry added: rollback, pause procedure, on-call escalation.

---

## 14. Open questions & deferred decisions

1. **Event bus durability.** `lib/events.ts` today is in-process. Phase 2+ may need
   durable queuing (Upstash QStash / Vercel KV cron) for retries across deploys.
   Decision deferred to Phase 2 scoping.
2. **Tenancy.** Manifest has `acts_on_behalf_of` but no `tenant_id` yet. Multi-office
   scoping (CLAUDE.md AD#10) may require a per-office agent-enablement matrix. Land
   with `Office` model in Phase 3.
3. **Approval UI surface.** Phase 1 ships a minimal table. A "Stripe Dashboard-calibre"
   reviewer UI with inline diffs is Phase 2+.
4. **Language coverage.** EN only through Phase 4 (matches CLAUDE.md §Product
   Identity). AR/PT prompts are deferred — the manifest's `locale` slot is present so
   we don't have to renegotiate the contract later.
5. **Regulatory posture.** ABA Model Rule 5.3 (non-lawyer assistance) and Model Rule
   1.6 (confidentiality) govern every agent that drafts for a client. Each
   client-facing agent PR must include a short "ABA 5.3 review" note from a lawyer
   owner. We do not ship agents to clients whose jurisdiction we have not vetted.
6. **Data residency.** Upstash / OpenAI / Anthropic region selection TBD; captured in
   a follow-up doc `docs/DATA_RESIDENCY.md` before Phase 2 go-live.

---

## 15. Minimal path to Phase-1 merge

The smallest set of diffs that justifies taking this from "planning" to "in flight":

1. This document merged.
2. `Claude.md` bumped to v3.1 with §Phase 8 referencing this doc.
3. Empty directory scaffolding: `agents/`, `lib/agents/`, `skills/core/`, `prompts/`,
   `scripts/` — each with a README.md describing its purpose (no code yet).
4. Next sprint ticket opened: "Agent OS Phase 1 — runtime + Intake + Drafting + Email
   loop". All other agent work is blocked on that landing.

No agent is built in this PR. Discipline: contract first, agents second.

