# LVJ Execution Plan — Master Orchestration Contract

*Version 1.2 — April 2026 · Owner: Khaled Aun (founder) · Maintainer: Claude Code*
*Companion to `Claude.md` v4.0 · `docs/PRD.md` v0.3 · `docs/AGENT_OS.md` v0.1 · `docs/DECISIONS.md` · `docs/EXECUTION_LOG.md` · `docs/BUGS.md`*

> **Purpose.** This document is the *operational* spine of the build. It
> answers — for every session, every PR, every sprint — *how* work gets
> audited, smoke-tested, logged, learned from, and orchestrated across
> Claude Code subagents, without ever blowing the timeout budget or
> crossing a security/safety line.
>
> **Source of authority.**
> - **Architecture / scope conflicts** → `Claude.md` v4.0 wins.
> - **Product contract conflicts** → `docs/PRD.md` v0.3 wins.
> - **Sprint ordering** → `docs/DECISIONS.md` D-019 wins.
> - **Agent contract** → `docs/AGENT_OS.md` wins.
> - **Process / how-we-execute conflicts** → *this file* wins.
>
> If this file ever drifts from `Claude.md` it is a defect — open a
> `D-NNN` reconciliation entry.

---

## 0. How to read this · timeout protocol

### 0.1 Reading order (every session, in order)

1. `docs/PRD.md` v0.3 — product contract.
2. `Claude.md` v4.0 — engineering contract.
3. `docs/EXECUTION_LOG.md` — what actually landed (newest last).
4. `docs/DECISIONS.md` — every binding decision with `D-NNN`.
5. `docs/AGENT_OS.md` — only if the task touches an agent.
6. **This file** — only if the task touches process, audit, smoke
   testing, bug logging, learning, or multi-agent orchestration.
7. The relevant `skills/<domain>/SKILL.md` — only if the task is in
   that domain.

If a session is short on context budget, read this file's §1
(artefact map) and §10 (sprint runbook) first; everything else
indexes from there.

### 0.2 Timeout protocol — *while writing this plan or any plan*

Long single-shot writes are the #1 cause of sandbox timeouts. Apply
these rules to every multi-section doc the agent produces, including
this one.

1. **Chunk every doc write to ≤ 8 KB per call.** Use `Write` for the
   first chunk, `Edit` (`new_string` appends) for the rest. Never try
   to emit a >25 KB file in one tool call.
2. **No file >2000-line read in a single `Read`.** Use `offset` +
   `limit`. The `Claude.md` file already crossed this line — every
   future read of it must be paginated.
3. **Per-call wall clock ≤ 90 s.** If a `Bash` command might exceed,
   either narrow the command or run it in `run_in_background: true`.
4. **No `sleep` loops.** Use `Monitor` for a long-running wait; use
   `until <check>; do sleep 2; done` only if a poll is unavoidable.
5. **`grep -r` on the whole repo is a timeout.** Always scope by
   `--include` and a top-level path; never run from `/`.
6. **Reading PR data.** `mcp__github__list_pull_requests` returns the
   full body of every PR — for repos with >5 open/closed PRs, paginate
   with `perPage: 5` and walk pages, or save the file and `jq` it.

### 0.3 Timeout protocol — *while executing a sprint*

Per-sprint guardrails, in addition to the AOS budgets in
`docs/AGENT_OS.md` §9:

| Constraint                                  | Limit                  | Enforced by                         |
|---------------------------------------------|------------------------|-------------------------------------|
| Tool calls per session before context check | 40                     | Self-discipline (agent re-plans)    |
| Subagent run wall-clock                     | 10 min default · 30 min hard | `Agent` tool `model` + prompt    |
| Single `Bash` step                          | 2 min default · 10 min hard  | `Bash.timeout` parameter         |
| `Agent` background tasks active             | ≤ 4 concurrent         | Self-discipline                     |
| Single `Edit` `old_string` size             | ≤ 4 KB                 | Self-discipline                     |
| `npx prisma migrate dev`                    | run in background      | `run_in_background: true` + Monitor |
| `npm install` first time in sandbox         | run in background      | `run_in_background: true`           |
| `next build` / `playwright install`         | run in background      | `run_in_background: true`           |

If a sprint's smoke battery (§3) is projected to exceed 30 min wall
clock, *split the sprint* — never silently extend the budget.

### 0.4 What "small batch" means in practice

When a single session must produce a doc, a feature, *and* a test
suite, the agent's natural-language plan must list discrete batches
of ≤ 3 tool calls each, with a checkpoint between batches:

> *Batch 1 (3 calls): write `lib/foo.ts`, write `__tests__/foo.test.ts`, run `npm test foo`. Checkpoint.*
> *Batch 2 (3 calls): wire route, run e2e, append `EXECUTION_LOG.md`. Checkpoint.*

The checkpoint is a one-line text update to the user. Never two
batches without a checkpoint.

---

## 1. Artefact map — who owns what

Every artefact in the repo answers exactly one question. Anything that
straddles two questions is a defect.

| Artefact                            | Question it answers                                  | Update trigger                              | Owner  |
|-------------------------------------|------------------------------------------------------|---------------------------------------------|--------|
| `docs/PRD.md`                       | What are we building, for whom, why?                 | Founder ratifies a scope change             | Khaled |
| `Claude.md`                         | What's the engineering contract?                     | Architecture or golden-rule shift           | Eng    |
| `docs/AGENT_OS.md`                  | How does an agent live and die?                      | Runtime / manifest contract change          | Eng    |
| `docs/DECISIONS.md`                 | Why did we choose X over Y?                          | A decision is taken in conversation         | Eng    |
| `docs/EXECUTION_LOG.md`             | What landed, in which commit, with what deferred?    | Every commit on a feature branch            | Eng    |
| **`docs/EXECUTION_PLAN.md`** (this) | How do we execute — audit, smoke, log, learn, orchestrate? | Process change, new audit, new orchestration pattern | Eng |
| **`docs/BUGS.md`** (new)            | What bugs exist, what's their severity, what's the fix status? | Bug discovered or fixed             | Eng    |
| `docs/AGENT_OS_CHANGELOG.md`        | What changed in the agent contract?                  | AOS contract bump                           | Eng    |
| `skills/<domain>/SKILL.md`          | What are the domain best practices for <domain>?     | Domain learning                             | Eng    |
| `prompts/<agent>/v<N>.md`           | What is the *current* prompt for <agent>?            | Prompt iteration (versioned)                | Eng    |
| `prompts/<agent>/v<N>.golden.md`    | What output do we regression-test against?           | Refresh with prompt bump                    | Eng    |
| `agents/<id>/manifest.yaml`         | What is this agent allowed to do?                    | Agent capability change                     | Eng    |
| `agents/<id>/README.md`             | Who owns this agent, how do I roll it back?         | Owner / runbook change                      | Eng    |

Hard rule: **no information lives in only one human's head**. If a
decision was made in conversation and only Khaled remembers it, the
session that ends without a `D-NNN` entry has not finished.

---

## 2. Audit framework

Auditing in this codebase is *continuous*, not a one-time Phase 0
exercise. There are five distinct audit surfaces; each runs on a
different cadence with a different owner.

### 2.1 Audit catalogue

| ID    | Audit                          | Cadence                  | Owner            | Output                                      | Blocks                  |
|-------|--------------------------------|--------------------------|------------------|---------------------------------------------|-------------------------|
| A-001 | Phase 0 baseline audit         | Once per major rebaseline (currently v4.0) | Lead engineer | `EXECUTION_LOG.md` entry + checklist | Sprint 0.1 start |
| A-002 | Auth-on-every-route audit      | Per PR + weekly cron     | Eng + CI         | `docs/BUGS.md` entries (severity Sev-1/2)   | Merge to `main`         |
| A-003 | Tenant-isolation audit         | Per PR touching Prisma + nightly cron | Eng + CI | `BUGS.md` (Sev-1) + `AuditLog` row     | Merge + deploy          |
| A-004 | Jurisdiction audit (D-006)     | Per PR + weekly cron     | Eng + CI         | `BUGS.md` (Sev-3) until cleared             | None — informational    |
| A-005 | Dynamic-route audit (D-025 §4) | Per PR                   | Eng + CI (`scripts/audit-dynamic.ts`) | Block merge on any DB-reading route missing `force-dynamic` / `revalidate = 0` | Merge to `main` |
| A-006 | Cost-guard audit               | Daily cron (UTC midnight)| Cost Guard svc   | `AutomationLog` aggregate + Slack/email     | Pauses non-critical agents |
| A-007 | Guardrail incident audit       | Per LLM output (online)  | `lib/agents/guardrails.ts` | `BUGS.md` if pattern-classified bug | Pauses agent if rate >5%  |
| A-008 | Dependency / CVE audit         | Weekly cron              | Eng + CI         | `BUGS.md` (Sev-2 if exploitable)            | Merge if Sev-1 CVE      |
| A-009 | Secret-scanning audit          | Per push                 | GitHub secret-scan + `mcp__github__run_secret_scanning` | `BUGS.md` (Sev-1 always) | Push      |
| A-010 | Doc-discipline audit           | Per PR (CI)              | `scripts/lint-docs.ts` (TBD) | PR comment, fail check                  | Merge                   |
| A-011 | KB freshness audit             | Weekly cron              | Skill owner      | GitHub issue per stale article              | None — opens issues     |

### 2.2 Audit runbooks

Every audit gets a 5-line runbook in `scripts/audits/<id>.md` (TBD).
At minimum the runbook lists:
1. Exact command(s) to run.
2. What "pass" looks like (exit code + expected stdout shape).
3. Where the result is logged (file path + section).
4. Who is paged on failure.
5. The supersedes / related D-NNN entry, if any.

### 2.3 Phase 0 baseline audit — A-001 (already encoded)

Defined in `Claude.md` §Phase 0. The 9 commands listed there are the
canonical baseline. **A-001 is run once per `Claude.md` major version**
(v3 → v4 ran on 2026-04-22 in PR #8). It is *not* re-run per PR — that
is what A-002…A-010 are for.

### 2.4 Per-PR audit gate (CI checklist)

Every PR opened against `main` must satisfy, before merge:

- [ ] **A-002** — `scripts/audit-auth.ts` exits 0 (no new route lacks `assertCaseAccess` / `assertOrgAccess` / `assertTenantAccess`).
- [ ] **A-003** — `scripts/audit-tenant.ts` exits 0 (no new business model lacks `tenantId` FK; no query bypasses tenant middleware without `crossTenant: true`).
- [ ] **A-004** — `scripts/audit-jurisdiction.ts` reports zero new occurrences of `USCIS|RFE|EB5|H1B|N400|IOLTA|DS-160|ABA Model Rule 1\.6` outside legacy comment blocks.
- [ ] **A-005** — `scripts/audit-dynamic.ts` exits 0 (every DB-reading `route.ts(x)` / `page.tsx` declares `dynamic = 'force-dynamic'` + `revalidate = 0`, per D-025 §4).
- [ ] **A-008** — `npm audit --omit=dev` exits 0 or all findings are documented in `BUGS.md` with planned fix dates.
- [ ] **A-010** — `EXECUTION_LOG.md` has a new section for the head commit; if the PR changes a long-lived contract (`Claude.md`, `AGENT_OS.md`, manifest schema, RBAC model, Prisma schema) the affected doc has a bumped version header.

These scripts are part of the Sprint 0.1 deliverable (§10). Until
they exist, the gate is enforced by manual review and the reviewer
ticks the boxes in the PR description.

### 2.5 Recurring cron audits

| Cron                                | Audit | Trigger             | Action on fail                                     |
|-------------------------------------|-------|---------------------|----------------------------------------------------|
| `cron/audit-auth-weekly`            | A-002 | Sun 03:00 UTC       | Open GitHub issue · page Tenant Admin              |
| `cron/audit-tenant-nightly`         | A-003 | Daily 03:15 UTC     | Open GitHub issue · page Platform Admin (Sev-1)    |
| `cron/audit-jurisdiction-weekly`    | A-004 | Sun 03:30 UTC       | Open GitHub issue (Sev-3, informational)           |
| `cron/audit-kb-staleness-weekly`    | A-011 | Mon 03:00 UTC       | Per-article issue assigned to skill owner          |
| `cron/audit-cost-daily`             | A-006 | Daily 00:05 UTC     | Pause non-critical agents · email Platform Admin   |
| `cron/audit-deps-weekly`            | A-008 | Sun 04:00 UTC       | PR auto-opened with `npm audit fix` if safe        |
| `cron/audit-doc-discipline-weekly`  | A-010 | Sun 04:30 UTC       | Issue listing PRs that landed without log entries  |

All cron handlers are Vercel Cron Jobs per `Claude.md` AD#6. Each
handler dispatches an event (`cron.audit.<id>`) on `lib/events.ts`;
the audit logic itself lives in `services/audits/<id>.ts` so it can
also be invoked manually.

---

## 3. Smoke testing framework

Smoke tests answer: *"if I shipped this commit to production right
now, would the platform's load-bearing flows still work?"* They are
not unit tests (those live in `__tests__/`) and not full E2E suites
(those live in `e2e-tests/`). Smoke tests are the **fastest possible
proof** that the trifecta — auth, tenant isolation, golden agent
loop — still works.

### 3.1 Smoke catalogue

| ID    | Smoke                                | When it runs                  | Wall-clock budget | Pass criteria                                              |
|-------|--------------------------------------|-------------------------------|-------------------|------------------------------------------------------------|
| S-001 | Build + typecheck                    | Per PR (pre-merge)            | ≤ 3 min           | `next build` exit 0; `tsc --noEmit` exit 0                 |
| S-002 | Jest unit suite                      | Per PR (pre-merge)            | ≤ 4 min           | `npm test` exit 0; coverage ≥ baseline                     |
| S-003 | Auth smoke (11-route adversarial)    | Per PR (pre-merge)            | ≤ 90 s            | All known unauthed routes return 401 (Sprint 0.1 baseline) |
| S-004 | Tenant-isolation smoke (A↔B matrix)  | Per PR touching Prisma        | ≤ 2 min           | Tenant A session reads/writes Tenant B → 403 + audit row   |
| S-005 | AOS golden loop (intake→draft→email) | Per PR touching `agents/` or `lib/agents/` | ≤ 2 min | Test-mode lead → HITL row created → approval → NotificationLog row |
| S-006 | Guardrail smoke (banned-phrase)      | Per PR touching `agents/drafting/` or guardrails | ≤ 30 s | Injected "guaranteed approval" → blocked, `BUGS.md` not appended |
| S-007 | Cost-guard smoke (forced 20× cost)   | Per PR touching `lib/agents/cost-guard.ts` | ≤ 30 s | Run aborts with `CostExceeded`, `agent.circuit_broken` emitted |
| S-008 | Circuit-breaker smoke                | Per PR touching `lib/agents/breaker.ts` | ≤ 30 s | 3 forced provider failures within 5 min window → breaker open  |
| S-009 | Webflow webhook smoke (HMAC)         | Per PR touching `app/api/webhooks/webflow/` | ≤ 30 s | Bad signature → 401; good signature → `MarketingLead` row     |
| S-010 | Locale smoke (EN + AR render)        | Per PR touching `components/lvj/*` or `messages/` | ≤ 90 s | `/en/dashboard` + `/ar/dashboard` render without console error; RTL applied |
| S-011 | Stripe Connect smoke (test mode)     | Per PR touching `app/api/commission/` or `lib/commission.ts` | ≤ 90 s | Mock payout sequence → `CommissionLedger` rows match expected  |
| S-012 | Playwright headless mini-suite       | Per merge to `main`           | ≤ 6 min           | Sign-in → dashboard → cases list → case detail load           |
| S-013 | Production deploy smoke              | Per Vercel deploy             | ≤ 3 min           | `/api/healthz` 200 + headers + DB ping + ai-router ping       |

**Total per-PR smoke budget: ≤ 14 min wall clock.** S-001 + S-002
parallel; S-003 → S-011 sequential or grouped; S-012 only on merge.

### 3.2 Smoke harness

Smokes live under `scripts/smoke/<id>.ts` and are invoked by:

```bash
npm run smoke              # runs the per-PR battery (S-001..S-011)
npm run smoke:merge        # runs S-001..S-012
npm run smoke:deploy       # runs S-013 against the live URL
npm run smoke -- --only S-005,S-006   # subset
```

Each smoke writes a one-line JSON record to
`test-results/smoke-<run-id>.jsonl`:

```json
{"id":"S-005","status":"pass","durationMs":1822,"correlationId":"...","commit":"a2d1b6d"}
```

The merge gate reads the file and refuses to merge on any `status:
"fail"`. Failures are appended to `docs/BUGS.md` automatically by
`scripts/smoke/report-failures.ts` (see §4.4).

### 3.3 Smoke data isolation

- Every smoke runs against a dedicated **smoke tenant** (`tenantId =
  smoke-pr-<pr-number>` for PR runs, `smoke-nightly` for cron). Never
  against the LVJ tenant.
- Smoke tenants are torn down at the end of the run via
  `scripts/smoke/teardown.ts`.
- Smokes that need an outbound channel (S-009, S-011) use the vendor's
  test mode (Stripe test keys, Webflow staging webhook secret). No
  real LLM call, real WhatsApp send, or real Stripe charge during a
  smoke.

### 3.4 Sandbox-without-DB fallback

When the sandbox lacks a Postgres instance (the current state — see
`EXECUTION_LOG.md` rolling open items), smokes that hit Prisma run
with `SKIP_DB=1` and fall back to an in-memory mock built into
`lib/test-utils/db-mock.ts` (TBD in Sprint 0.1). The mock asserts the
*shape* of writes, not their durability — enough to keep CI green
while a real DB is provisioned. The pre-merge gate refuses to ship to
`main` with `SKIP_DB=1` unless the PR is doc-only.

### 3.5 What is *not* a smoke

- A full Playwright run across every screen → that's the per-merge
  E2E (`npm run test:e2e`).
- A full provider-onboarding wizard click-through → Sprint 8.5
  acceptance test.
- A real LLM call → never. Smokes use canned responses keyed by
  prompt-hash from `__tests__/fixtures/ai-responses/`.

---

## 4. Bugs & fixes log

`docs/BUGS.md` is the single source of truth for known defects,
their severity, and their fix status. It is the *bug-tracking
counterpart* of `docs/DECISIONS.md` and follows the same discipline:
**bugs are appended, never edited in place** (a fix is a new entry
that supersedes the original).

### 4.1 Severity scale

| Sev   | Definition                                                                                       | SLA to triage | SLA to fix          |
|-------|--------------------------------------------------------------------------------------------------|---------------|---------------------|
| Sev-1 | Tenant-isolation breach · auth bypass · data loss · plaintext credential · Stripe miscalculation | 15 min        | 24 h, branch from `main` |
| Sev-2 | Crashing flow on a load-bearing screen · failed cron · CVE with exploit · KB confidence false-positive | 1 h | 5 business days     |
| Sev-3 | UX defect · localisation gap · stale doc · cosmetic regression · jurisdiction-audit hit          | 1 business day | Next sprint         |
| Sev-4 | Nice-to-have · refactor candidate · perf < 2× threshold                                          | None          | Backlog             |

Sev-1 always pages Platform Admin (D-013 critical tier). Sev-2 routes
to the on-call lead. Sev-3 + Sev-4 wait for the next standup.

### 4.2 Bug entry format

Every entry in `docs/BUGS.md` has the same shape (mirrors `D-NNN`):

```
## B-NNN · <one-line title> · Sev-<N> · <status> · <date> · <reporter>

- **Discovered by:** <commit | smoke id | audit id | user report | agent guardrail incident>
- **Affected:** <file paths · routes · models · agents>
- **Reproduction:** <minimal command or steps>
- **Root cause:** <one paragraph; null if not yet diagnosed>
- **Fix:** <commit SHA(s) · PR # · or "pending">
- **Related:** <D-NNN entries · other B-NNN · A-NNN audit id>
```

Status values: `open | triaged | in_progress | fixed | wontfix |
superseded-by: B-MMM`.

### 4.3 What is *not* a bug

- A scope cut → that's a `D-NNN` decision.
- An incomplete sprint deliverable → that's a `Rolling open item` in
  `EXECUTION_LOG.md`.
- A failing test on a feature branch that has not been pushed → not
  yet a bug; only a smoke / audit failure on a pushed branch logs.

### 4.4 Auto-population from smokes & audits

- Smoke harness (§3.2) appends a Sev-2 entry on any failure of S-003
  through S-011 with the run's `correlationId`, the commit, and the
  failing assertion.
- Audit cron (§2.5) appends Sev-1 / Sev-2 entries per the audit's
  output. A-009 (secret scanning) is *always* Sev-1 and never
  auto-closed.
- Guardrail incidents that breach the per-agent rolling threshold
  (§9 — circuit breaker) append a Sev-2 entry.

Auto-appended entries are flagged `discovered_by: auto` in the entry
metadata so the weekly review can distinguish noise.

### 4.5 Bug review cadence

- **Daily** — Sev-1 + Sev-2 only. 5-min triage; either fix-in-flight
  or accept the page.
- **Weekly** — full Sev-3 walk; close anything stale, promote
  anything regressing.
- **Per sprint kickoff** — Sev-4 backlog grooming; promote one Sev-4
  to a sprint task or close.

### 4.6 Linkage to learning loop

When a bug's root-cause field cites a *pattern* (rather than a
one-off — e.g. "third banned-phrase incident from the Drafting agent
in 14 days"), the fix PR must also:
1. Add a regression smoke under `scripts/smoke/` if one didn't catch
   it.
2. Update the relevant `skills/<domain>/SKILL.md` with a
   "Common pitfalls" entry.
3. Add a golden fixture under `prompts/<agent>/v<N>.golden.md` if
   the bug originated in an agent prompt.

This is the explicit handoff from §4 to §5.

---

## 5. Continuous learning & improvement loop

The system gets *measurably* better between releases or it hasn't
shipped. Learning lives in three places: the **knowledge base**, the
**golden fixture set**, and the **decision log**. Every bug, every
HITL rejection, every audit hit is a candidate input to one of those
three.

### 5.1 The four feedback streams

```
        ┌──────────────────────────────────────────────────────────────┐
        │   Sources of signal                                          │
        ├──────────────────────────────────────────────────────────────┤
        │  (a) HITL approver edits   → diff vs draft                   │
        │  (b) Bug entries (B-NNN)   → root-cause classification       │
        │  (c) Audit hits (A-NNN)    → systemic pattern detection      │
        │  (d) User feedback         → conversation → decision capture │
        └────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────────────────────────┐
        │   Weekly KB feedback queue (Analytics/QA agent — AOS Phase 4)│
        │   · clusters edits, bugs, audits by skill / agent / template │
        │   · proposes: KB article diff, golden fixture diff, D-NNN    │
        │   · NOTHING auto-merges — every proposal is a PR             │
        └──────────────────────────────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────────────────────────┐
        │   Three sinks                                                │
        │  (1) skills/<domain>/SKILL.md — pattern → rule / pitfall     │
        │  (2) prompts/<agent>/v<N>.golden.md — pattern → fixture      │
        │  (3) docs/DECISIONS.md — pattern → binding D-NNN             │
        └──────────────────────────────────────────────────────────────┘
```

### 5.2 HITL diff capture (already in AOS Phase 1)

`HITLApproval.diff` already stores the approved-version vs draft
diff. The Analytics/QA agent (AOS Phase 4) clusters diffs whose
`edit_distance / output_length > 0.25` per template per agent per
week. Each cluster opens *one* "candidate KB update" GitHub issue
with:
1. The pattern (regex or short prose).
2. Sample diffs (3 anonymised examples).
3. The proposed `skills/<domain>/SKILL.md` paragraph.
4. The proposed banned-phrase / required-phrase list update.

A skill owner accepts or rejects the issue; the accepted change ships
in a PR that *also* refreshes the relevant golden fixture. No silent
KB rewrites.

### 5.3 Prompt versioning rule

When a prompt changes (`prompts/<agent>/vN.md` → `vN+1.md`):

- [ ] New file at `vN+1.md` — never edit the old one in place.
- [ ] New golden fixture at `vN+1.golden.md` — capture 5–10 reference
      runs against canonical inputs.
- [ ] Manifest version bump (`agents/<id>/manifest.yaml`).
- [ ] Regression smoke (S-005 family) compares new outputs against
      old golden + against new golden — both runs visible in the PR.
- [ ] `EXECUTION_LOG.md` entry references the prompt diff and the
      smoke result.

The old prompt + golden remain in repo for archaeology.

### 5.4 Skill maturity ladder

Every `skills/<domain>/SKILL.md` carries a `confidence:` field in its
front-matter (already in `docs/AGENT_OS.md` §6.2). Maturity levels:

| Level             | Criteria to enter                                                        | What agents may do with it                       |
|-------------------|--------------------------------------------------------------------------|--------------------------------------------------|
| `experimental`    | Default for any new skill scaffold                                       | Internal-only outputs; never shown to client     |
| `draft`           | At least one PR with author sign-off                                     | Internal + lawyer-review-only                    |
| `reviewed`        | One owner-of-record listed; one staleness review passed                  | Lawyer-supervised client outputs                 |
| `authoritative`   | Owner + 1 cross-reviewer · cited by >= 1 KPI on a shipped agent · current within `review_ttl_days` | Client-facing outputs without per-call HITL (subject to other gates) |
| `deprecated`      | Superseded by another article or by a D-NNN                              | Read-only; agents refuse to cite                 |

Demotion is automatic: any article past `2× review_ttl_days` without
a refreshed `reviewed_at` flips from `authoritative` → `draft` per
`docs/AGENT_OS.md` §6.4. `BUGS.md` does *not* log this — the
staleness sweep opens a per-article issue (A-011).

### 5.5 Decision capture rule (D-005, restated operationally)

Every new D-NNN entry must:
1. Cite the *source* — conversation transcript, PR comment, or audit
   id.
2. List *consequences* — every file / model / agent / skill that
   needs to change.
3. List the *implementation PR*(s) — even if "pending". An accepted
   decision with no scheduled PR is itself a B-Sev-3 bug (we owe
   ourselves the work).
4. Cross-link to any superseded D-NNN.

A decision without #1 and #3 is rejected at PR review.

### 5.6 Quarterly contract review

Every quarter (or every major `Claude.md` version bump, whichever
comes first), the lead engineer reads:
- All `B-Sev-1` and `B-Sev-2` entries closed since the last review.
- All `D-NNN` entries accepted since the last review.
- The Analytics/QA agent's quarterly summary (top patterns, top
  agents-by-incident).

Output: a single PR that either (a) bumps `Claude.md` major version
with reconciliation notes, or (b) explicitly states "no contract
change needed". Quarterly review is itself an entry in
`EXECUTION_LOG.md`.

---

## 6. Multi-agent Claude Code orchestration

This section is the *meta* layer — how *Claude Code itself* (the CLI
running this session) decomposes work across its own subagents to
build the LVJ AssistantApp. It is *not* `docs/AGENT_OS.md`, which
governs the in-product agents (Intake, Drafting, Email, etc.). The
two agent surfaces share principles (manifest, budgets, observability)
but live in different layers.

### 6.1 Two agent surfaces — keep them separate

| Surface                | What it is                                                   | Where it lives                | Owner of contract  |
|------------------------|--------------------------------------------------------------|-------------------------------|--------------------|
| **AOS in-product**     | Agents serving end users / staff (Intake, Drafting, …)       | `agents/<id>/`                | `docs/AGENT_OS.md` |
| **Claude Code build**  | Subagents Claude Code spawns *during a build session* to write code, run tests, audit | `Agent` tool calls in CLI | This file §6      |

A common confusion: an "Intake Agent" is a product feature; an
"Explorer subagent" is a build tool. Mixing the two leads to
manifest pollution and budget overruns.

### 6.2 Claude Code subagent roster

The Claude Code session running this build uses these subagent types
(spec'd by their system prompts; not all are available in every
environment):

| Subagent           | When to spawn                                           | Tool budget        | Wall clock | Concurrency           |
|--------------------|---------------------------------------------------------|--------------------|------------|-----------------------|
| `Explore` (quick)  | Find files / strings; <3 query target                   | Read/Bash/Grep     | ≤ 3 min    | Up to 3 in parallel   |
| `Explore` (medium) | Trace a feature across 5–15 files                       | Read/Bash/Grep     | ≤ 6 min    | Up to 2 in parallel   |
| `Explore` (very thorough) | Full-codebase audit (jurisdiction sweep, tenant audit) | Read/Bash/Grep | ≤ 15 min  | 1 at a time           |
| `Plan`             | Design implementation plan for a sprint                 | Read-only          | ≤ 8 min    | 1 at a time           |
| `general-purpose`  | Multi-step research that requires writes (rare in build) | All tools         | ≤ 20 min   | 1 at a time           |
| `claude-code-guide`| Questions about Claude Code itself (hooks, settings)    | Bash/Read/WebFetch | ≤ 5 min    | 1 at a time           |
| `statusline-setup` | Configure status line                                   | Read/Edit          | ≤ 2 min    | 1 at a time           |

Hard rules — encoded into every prompt the parent gives a subagent:
- A subagent **never** mutates git state. No commits, no pushes, no
  rebases, no branch creation. The parent session owns git.
- A subagent **never** edits `EXECUTION_LOG.md`, `DECISIONS.md`,
  `BUGS.md`, or this file. Those are parent-session-only.
- A subagent's prompt must be *self-contained* — the subagent has no
  memory of the parent conversation.
- A subagent's prompt must declare the report length cap ("under 200
  words", "table only", "JSON shape X") — otherwise responses bloat.
- A subagent's prompt must list *what's already known* and *what's
  off-limits*, so it doesn't redo work or wander.

### 6.3 Parent ↔ subagent handoff protocol

The parent session is responsible for:
1. **Decomposing** the work into independent units (sprint task →
   subagent prompts).
2. **Briefing** each subagent with goal, context, constraints,
   report cap.
3. **Verifying** each subagent's claimed result *before* trusting it
   (`Trust but verify` from the system prompt). When a subagent
   reports "all routes have auth", the parent runs the audit script
   itself.
4. **Synthesising** the subagent reports into a single artefact (PR
   description, `EXECUTION_LOG.md` entry, `D-NNN` row).
5. **Committing** the artefacts.

Subagents are stateless workers; the parent is the only orchestrator.

### 6.4 Parallelism rules

When a sprint contains independent investigations, the parent fires
**multiple subagents in a single message** (multiple `Agent` tool
calls in one block) — this is the only way they run concurrently.

Caps:
- ≤ 3 `Explore` subagents in parallel (quick / medium tier).
- ≤ 1 `general-purpose` or `Plan` subagent at a time.
- Never spawn a subagent while another subagent of the same type is
  running on overlapping scope (writes collide).

When a subagent is `run_in_background: true`, the parent does **not
poll** — it continues other work and is notified on completion. No
sleep loops, no `until` polls.

### 6.5 Mapping AOS sprints → Claude Code subagent recipes

Per-sprint orchestration patterns. Each sprint has a *recipe*: which
subagents to spawn, in what order, with what brief.

#### Sprint 0.1 — close 11 unauthed routes

```
Batch 1 (parallel):
  Explore (medium):  "List every file under app/api/ — for each, report
                      whether it imports assertCaseAccess, assertOrgAccess,
                      or assertTenantAccess. Output a markdown table.
                      Under 300 words."
  Explore (quick):   "Find every NextResponse.json call inside app/api/
                      that does not have an awaited auth check above it
                      in the same file. List file + line. Under 200 words."
Checkpoint → parent reconciles list against Phase 0 audit §9.
Batch 2 (sequential, parent does the writes):
  - Edit each route to wrap with the right helper.
  - Add adversarial Playwright spec at e2e-tests/auth-smoke.spec.ts.
  - Run S-003 smoke; verify 11/11 return 401 unauthed.
  - Append EXECUTION_LOG.md entry; open PR.
```

#### Sprint 0.5 — multi-tenancy foundation

```
Batch 1 (parallel):
  Plan:            "Design lib/tenants.ts: assertTenantAccess(),
                    Prisma client middleware that scopes every query by
                    session.user.tenantId, crossTenant: true bypass with
                    AuditLog write. Output: file outline + zod schemas +
                    test plan. Under 600 words."
  Explore (very thorough): "Inventory every prisma.<model>.<verb> call
                            in lib/, app/, agents/, services/. Output:
                            table model | callsite | already-tenant-scoped?
                            Under 800 words."
Checkpoint → parent picks the implementation order (highest-risk first).
Batch 2 (parent writes, no subagent):
  - prisma migration: Tenant + TenantContract + tenantId backfill.
  - lib/tenants.ts implementation.
  - Adversarial isolation suite (smoke S-004).
  - EXECUTION_LOG entry.
```

#### Sprint 0.7 — AR + RTL

```
Batch 1 (parallel):
  Explore (medium): "List every file under components/lvj/ that uses
                     ml-* or mr-* Tailwind utilities (non-logical).
                     Output table file:line:class. Under 400 words."
  Explore (quick):  "Find every <Image>, <Icon>, and <Chevron*> usage in
                     components/lvj/. Note which need RTL flipping per
                     Claude.md §Phase 2 RTL Component Design Rules.
                     Under 200 words."
Checkpoint → parent decides Tailwind plugin vs codemod.
Batch 2: parent runs codemod, adds messages/ar.json, wires next/font.
Batch 3: smoke S-010, EXECUTION_LOG entry.
```

#### Sprint 8.5 — self-serve onboarding

```
Batch 1 (parallel):
  Plan:            "Design app/(public)/onboarding/ wizard for tenant +
                    provider, integrating Stripe Connect Express
                    onboarding (D-016). Output: route map + state
                    machine + OnboardingProgress writes. Under 800 words."
  Explore (medium): "Find any existing onboarding-shaped code in
                     signup/, app/(auth)/, scripts/seed.ts.
                     Output table. Under 300 words."
Checkpoint → parent decides reuse boundary.
Batch 2..N: parent writes the wizard; one EXECUTION_LOG entry per route.
```

The recipe library lives in `docs/orchestration/recipes/<sprint>.md`
(TBD; created lazily as each sprint begins).

### 6.6 Context preservation across sessions

Sessions die. The next session must reconstruct state from disk in
under 2 minutes. The reconstruction protocol:

1. Read `EXECUTION_LOG.md` last 3 entries.
2. Read `DECISIONS.md` D-NNN since the last `Claude.md` version bump.
3. Read `BUGS.md` open Sev-1 + Sev-2.
4. Read this file's §10 (sprint runbook) for the next sprint's
   recipe.

If any of those files is missing or stale, the first task of the new
session is to reconstruct it from `git log` + this file's §1 artefact
map. **Reconstruction itself is a `B-NNN` bug** if it took >5 min.

---

## 7. Logging contract — the full observability spine

There are *six* logs in this system. Every event of consequence
writes to exactly one or more of them. Cross-log correlation happens
via a single `correlationId` propagated end-to-end.

### 7.1 The six logs

| Log                          | Layer            | What it records                                      | Owner               | Retention              |
|------------------------------|------------------|------------------------------------------------------|---------------------|------------------------|
| `AuditLog` (Prisma)          | Domain           | Material state changes (case status, tenant access, RBAC denies) | `lib/audit.ts`     | 7 years (legal hold)   |
| `AutomationLog` (Prisma)     | Agent runtime    | One row per `invoke()` call (cost, duration, status, escalation) | `lib/agents/invoke.ts` | 2 years              |
| `NotificationLog` (Prisma)   | Channel          | Every outbound email / WhatsApp / SMS / voice / push | Channel agents      | 2 years                |
| `VoiceCallLog` (Prisma)      | Channel          | Twilio call SID, duration, transcript ref            | `agents/voice/`     | Per `core/privacy/retention.md` |
| **`docs/EXECUTION_LOG.md`**  | Build process    | Every commit on a feature branch                     | Lead engineer       | Forever (git)          |
| **`docs/BUGS.md`**           | Quality          | Every bug + fix                                      | Lead engineer       | Forever (git)          |

Three are runtime (`AuditLog`, `AutomationLog`, `NotificationLog`),
one is per-channel runtime (`VoiceCallLog`), two are build-time
(`EXECUTION_LOG.md`, `BUGS.md`). Cron audits straddle: they emit
runtime rows *and* may append `BUGS.md` entries.

### 7.2 The correlation id contract

`correlationId` is a UUIDv7 (sortable, time-prefixed) generated at
the *outermost* event boundary:

| Boundary                                  | Where the id is born                          |
|-------------------------------------------|-----------------------------------------------|
| Public webhook (Webflow form submit)      | `app/api/webhooks/webflow/route.ts` first line |
| Public form (Eligibility quiz)            | `app/(public)/eligibility/actions.ts`         |
| Authenticated route (CRM action)          | `middleware.ts` request entry                 |
| Cron handler                              | `app/api/cron/<id>/route.ts` first line       |
| Agent invoke                              | Inherited from triggering event (never new)   |

Every downstream log row carries it. When a draft is generated by
Drafting and sent by Email, the two `AutomationLog` rows share the
same id; the `NotificationLog` row carries it; `AuditLog` rows for
state transitions on the same case carry it. One `WHERE
correlationId = ?` returns the entire chain.

`correlationId` is also stamped into the `X-Correlation-Id` response
header and propagated as `traceparent` if Vercel tracing is enabled
(post-MVP).

### 7.3 Log levels — what to write where

| Event class                                        | `AuditLog` | `AutomationLog` | `NotificationLog` | `EXECUTION_LOG.md` | `BUGS.md` |
|----------------------------------------------------|:----------:|:---------------:|:-----------------:|:------------------:|:---------:|
| RBAC deny                                          | ✔          |                 |                   |                    |           |
| Cross-tenant read (`crossTenant: true`)            | ✔ (`cross_tenant_access`) |     |                   |                    |           |
| Cross-tenant PII read (D-018)                      | ✔ (`cross_tenant_pii_access`) |  |                   |                    |           |
| Case status transition                             | ✔          |                 |                   |                    |           |
| Tenant created / contract signed                   | ✔          |                 |                   |                    |           |
| Agent invoke success                               |            | ✔               |                   |                    |           |
| Agent invoke escalated                             | ✔ (escalation event) | ✔ (status=`escalated`) |  |                    |           |
| Agent invoke circuit broken                        | ✔          | ✔ (status=`circuit_broken`) | |                  | Sev-2 (auto) |
| Agent invoke cost-exceeded                         | ✔          | ✔               |                   |                    | Sev-3 if pattern |
| Channel send (email/WA/SMS/voice/push)             | ✔          |                 | ✔                 |                    |           |
| Channel send blocked by consent / quiet hours      | ✔          |                 | ✔ (status=`suppressed`) |              |           |
| Webflow webhook bad HMAC                           | ✔          |                 |                   |                    | Sev-2 (auto, repeated) |
| Smoke failure on `main`                            |            |                 |                   |                    | Sev-2 (auto) |
| Audit cron failure                                 | ✔          |                 |                   |                    | Sev varies (auto) |
| Secret-scan hit                                    | ✔          |                 |                   |                    | **Sev-1 (auto)** |
| Commit on feature branch                           |            |                 |                   | ✔                  |           |
| Decision taken in conversation                     |            |                 |                   | (PR description)   |           |

If an event needs to write to >2 logs, the writes happen inside a
single Prisma transaction (`$transaction`) so partial chains never
exist. The build-time logs (`EXECUTION_LOG.md`, `BUGS.md`) are
appended in the same PR as the code.

### 7.4 What we never log

- **Plaintext passport numbers / DOBs / SSNs / NIFs** in any log
  field — the PII scrubber (`scripts/pii-scrub.ts`) runs on every
  string field before persistence. Tested by smoke S-006.
- **Plaintext document content** — only GCS keys and metadata. The
  vault is the source of truth.
- **API keys / Stripe webhook bodies in raw form** — Stripe payload
  is hashed; only `stripeEventId` is logged.
- **Full LLM prompts in `AutomationLog.prompt`** — only the
  `promptVersion` and a hash. The prompt is in git.
- **Client-attorney privileged content in `AuditLog`** — only that
  the privileged event happened, not its substance.

A log write that includes one of the above is a Sev-1 bug.

### 7.5 Where the operator looks

| Question                                          | First place to look                        |
|---------------------------------------------------|--------------------------------------------|
| What did this commit do?                          | `EXECUTION_LOG.md` (last entry)            |
| Why did this client get an email at 22:00?        | `NotificationLog` + correlationId          |
| Did anyone access tenant B's data from tenant A?  | `AuditLog WHERE action='cross_tenant_*'`   |
| What did the Drafting agent cost yesterday?       | `AutomationLog SUM(costUsd) GROUP BY day`  |
| Why is the Intake agent paused?                   | `BUGS.md` open Sev-1/2 + circuit breaker state |
| Why did we choose Stripe Connect over manual?     | `DECISIONS.md` D-016                       |
| Is this skill safe for client-facing output?      | `skills/<id>/SKILL.md` `confidence:` field |

`/admin/automation` (AOS Phase 4) is the human surface that joins
`AutomationLog` + `AuditLog` + `NotificationLog` by correlationId
into a single trace view. Until it ships, the operator runs the
queries by hand against the read replica.

---

## 8. Security & safety controls

This section is the *defensive* spine. Every control here maps to a
Golden Rule, an Architecture Decision, or a `D-NNN` entry. Nothing
new is invented — this section *enumerates* the controls so the
plan can verify that nothing has dropped.

### 8.1 Control matrix

| ID    | Control                                            | Source           | Enforced where                              | Smoke / Audit |
|-------|----------------------------------------------------|------------------|---------------------------------------------|---------------|
| C-001 | RBAC on every route                                | GR#2             | Per route via `assertCaseAccess` / `assertOrgAccess` | A-002, S-003 |
| C-002 | Tenant isolation                                   | GR#9 · D-019 0.5 | Prisma client middleware + `assertTenantAccess` | A-003, S-004 |
| C-003 | All AI through `lib/ai-router.ts`                  | GR#3             | `scripts/lint-agents.ts` + import check     | CI lint        |
| C-004 | Additive Prisma schema only                        | GR#4             | Per-PR diff review · `scripts/audit-prisma.ts` | A-010 (manual) |
| C-005 | `Promise.allSettled` for multi-channel             | GR#5             | Code review · grep for `Promise.all(` in `lib/events.ts` | CI lint |
| C-006 | i18n keys only — no hardcoded strings              | GR#6             | `next-intl` lint rule                       | CI lint        |
| C-007 | "AI-generated" disclosure on AI outputs            | GR#7             | UI badge component + `generatedBy` envelope | S-005 asserts badge |
| C-008 | Vault encryption at rest (AES-256-GCM)             | GR#8             | `lib/crypto.ts` · KMS key in env            | Per-PR review  |
| C-009 | HMAC-verified webhooks (Webflow, Stripe, Kaspo)    | AD#12            | `lib/webflow.ts` `verifyHmac` · `lib/stripe.ts` `constructEvent` | S-009 |
| C-010 | Marketing content HITL (24h SLA)                   | D-010            | `MarketingApproval` row + cron escalation   | E2E in Sprint 13 |
| C-011 | Cost guard caps (D-012)                            | D-012            | `lib/agents/cost-guard.ts` · per-tenant + platform | S-007 |
| C-012 | HITL tier routing (D-013)                          | D-013            | `lib/agents/hitl.ts` + `/admin/approvals`   | E2E per tier   |
| C-013 | Quiet hours / per-actor availability (D-014)       | D-014            | `lib/scheduling.ts` checked in every channel agent | Per-channel smoke |
| C-014 | License-jurisdiction parity for `attorney_approved_advice` | AGENT_OS §8 | `invoke()` wrapper checks `User.licensedJurisdictions` ⊇ `Case.destinationJurisdiction` | S-005 variant |
| C-015 | Consent flags for outbound channels                | AGENT_OS §8.1.4 | `Case.clientConsent.<channel>` checked at dispatch | Per-channel smoke |
| C-016 | Auto-pause on case (`Case.autoPauseUntil`)         | AGENT_OS §8.2   | `lib/scheduling.ts`                         | Per-agent smoke |
| C-017 | Banned-phrase / outcome-guarantee scanner          | AGENT_OS §8.1.2 | `lib/agents/guardrails.ts` post-LLM         | S-006          |
| C-018 | UPL classifier                                     | AGENT_OS §8.1.3 | `lib/agents/guardrails.ts` post-LLM         | S-006 variant  |
| C-019 | PII scrubber pre-persist                           | AGENT_OS §8     | `scripts/pii-scrub.ts` called from `invoke()` | S-006 variant |
| C-020 | Secret scanning on push                            | (this plan)      | GitHub secret scanning · `mcp__github__run_secret_scanning` | A-009 |
| C-021 | DSAR workflow (GDPR Art. 15 / 17 / 20)             | D-006 + Sprint 16 | `app/api/dsar/` · `DSAR` model            | E2E in Sprint 16 |
| C-022 | k-anonymity guard on Platform Marketing analytics  | D-018            | `lib/analytics.ts` enforces ≥5 cases per cell | Unit + S-011 variant |
| C-023 | Cross-tenant PII access audit (`cross_tenant_pii_access`) | D-018     | `lib/audit.ts` writes from `lib/analytics.ts` | A-003 variant |
| C-024 | Stripe Connect onboarding KYC                      | D-016            | Stripe handles · we verify `details_submitted` before payouts | E2E in Sprint 8.5 |
| C-025 | Vault path scoping (`/vault/providers/<providerId>/`) | AD#14         | `lib/crypto.ts` rejects writes outside scope | Unit + S-008 variant |

### 8.2 Threat model snapshot

Top threats explicitly modelled (loose STRIDE alignment):

1. **Cross-tenant data leak** (Spoofing/Information Disclosure) —
   mitigated by C-002, C-023.
2. **Lawyer-impersonation in `attorney_approved_advice`** (Spoofing)
   — mitigated by C-014.
3. **Outcome-guarantee in client comms** (UPL/legal exposure) —
   mitigated by C-017, C-018, C-007.
4. **Webhook forgery** (Spoofing) — mitigated by C-009.
5. **Cost-runaway from prompt injection or runaway loop** (DoS, $)
   — mitigated by C-011 and circuit breaker (§9 in AOS).
6. **Plaintext PII in logs** (Information Disclosure) — mitigated by
   C-019 + log-write review.
7. **Secret exposure in commits** (Information Disclosure) —
   mitigated by C-020 + `.env*` in `.gitignore`.
8. **Consent bypass on outbound** (Compliance) — mitigated by C-015.
9. **Stale KB cited as authoritative** (legal exposure) — mitigated
   by `confidence:` field demotion (§5.4).
10. **Quiet-hours violation** (compliance + UX) — mitigated by C-013.

Each threat → ≥1 control → ≥1 smoke or audit. Anything in this list
without a smoke/audit row is a *gap* and an open item for the next
sprint.

### 8.3 Security review checkpoints

A security review is mandatory at:
- Every `Claude.md` major version bump.
- Before enabling any agent feature flag in production.
- Before the first real-money Stripe Connect payout.
- Before exposing any new public surface (provider directory,
  marketing form).
- Quarterly (§5.6).

The review uses the `/security-review` skill (built into Claude
Code) and produces a `BUGS.md` entry per finding. Findings are
reviewed within the Sev-1 SLA.

### 8.4 Safety controls vs. UX trade-offs

Some controls have UX cost. Where the trade-off has been made:

| Trade-off                                             | Decision (D-NNN) | Rationale                                |
|-------------------------------------------------------|------------------|------------------------------------------|
| HITL adds latency to client comms                     | D-013            | Tier-1 SLA (4h) is the floor; Critical (15m) for urgent |
| Quiet hours delay urgent updates                      | D-014            | Tier-2/3 override; client-facing comms still wait until 08:00 client-local |
| `attorney_approved_advice` requires lawyer approval   | AGENT_OS §8     | Acceptable; the platform is lawyer-supervised by design |
| Cost cap pauses agents at $200/day                    | D-012            | Acceptable; deadline + escalation agents bypass         |
| k-anonymity hides cells <5 cases                      | D-018            | Acceptable; Platform Admin can request raw with audit   |

When a future trade-off requires another adjustment, it's a new
`D-NNN` — not a config flip.

---

## 9. Operational timeout runbook

§0.2 / §0.3 state the *rules*; this section is the *runbook* —
concrete moves when a timeout or capacity wall is imminent.

### 9.1 Symptoms → response

| Symptom (during a session)                             | First move                                              | Escalate to                                 |
|--------------------------------------------------------|---------------------------------------------------------|---------------------------------------------|
| "Stream idle timeout / partial response received"      | Abandon the partial write; re-plan in smaller chunks    | Split current tool call into ≤ 8 KB writes |
| Tool call pending > 90 s                               | Cancel, re-invoke with narrower scope                   | Run in background if truly long             |
| Conversation token context > 80% full                  | Delegate next research to `Explore` subagent            | Checkpoint the parent; start a new session  |
| `npm install` / `prisma generate` hangs                | Kill; re-invoke with `run_in_background: true`          | Poll via `Monitor`, not `sleep`             |
| `grep -r` across repo appears to hang                  | Kill; scope with `--include` + path prefix              | Use `Explore` subagent                      |
| `Read` on >2000-line file errors                       | Re-read with `offset` + `limit`                         | Or switch to `Grep` for targeted lookup     |
| Subagent report > 2000 words                           | Reject; re-brief with explicit word cap                 |                                             |
| Playwright run trends toward 30 min                    | Split into tagged suites; run only the PR-relevant tag  |                                             |
| `prisma migrate dev` blocked (no DB)                   | Set `SKIP_DB=1`; log deferred migration in `EXECUTION_LOG.md` | Provision DB as Sprint 0 blocker        |

### 9.2 The "one more tool call" trap

A session that has spent 38 of 40 budgeted tool calls *must not* try
to fit "just one more" write. Instead:

1. Write a one-line checkpoint for the user.
2. Record the next action in this file's §12 (open items) or
   `EXECUTION_LOG.md` rolling open items.
3. End the session.

Taking the 41st call almost always produces a partial write with no
recovery path.

### 9.3 Partial-response recovery

When a tool call appears to have partially written a file:

1. Do **not** retry the same `Write` call — it would overwrite.
2. Read the file to see what actually landed.
3. Compute the diff against intent; resume via `Edit` with a tight
   `old_string` matching the last known-good line.
4. If the partial write is inside a code block that would fail to
   parse (e.g. half a function), add a sentinel comment that makes
   the file parseable first, then fill in.

### 9.4 Background jobs — when and how

Use `run_in_background: true` for:
- `npm install` (first run in sandbox)
- `next build`
- `playwright install`
- `npm run test:e2e` (full suite)
- Long CI-style smokes (> 2 min projected)

Never use `run_in_background` for:
- Any `git` command (the parent must see the result before the next step).
- Any `Edit` / `Write` (these are synchronous by design).
- Any command whose output informs an immediate decision.

### 9.5 Sandbox without DB / node_modules

Current sandbox state: no Postgres, no `node_modules` installed.
Until provisioned, every sprint's recipe must:

1. Check `SKIP_DB=1` is honoured by all tests that touch Prisma.
2. Record deferred commands in the PR description *and* in
   `EXECUTION_LOG.md` rolling open items — never silently.
3. Never claim a test suite "passed" if it wasn't executed.
   Acceptable phrasings: "compiled and lint-clean", "not executed —
   see deferred list".

---

## 10. Sprint orchestration runbook

This is the *playbook* for driving sprints per D-019. Each sprint is
described with: goal, entry criteria, subagent recipe (from §6.5
when relevant), deliverables, smoke battery, exit criteria, typical
timeout risks.

### 10.1 Current position (as of this file's creation)

- Merged: PR #7 (Sprint 0 foundation), PR #8 (Phase 0 audit), PR #9
  (Claude.md v4.0 rebaseline), PR #10 (execution-plan framework),
  PR #12 (Sprint 0.5 — multi-tenancy foundation per D-023).
- On branch `claude/cross-repo-review-sprint-05-MT58G`
  (2026-04-23 session): cross-repo review of `yalla-london` +
  `KhaledAun.com`, D-024, Sprint 0.5.1 runAuthed migration, A-003
  flipped to blocking in the `gates` job.
- Next sprint in D-019 order: **Sprint 0.7 — AR + RTL** (Playwright
  EN + AR visual regression per §10.4 exit criteria).

### 10.2 Sprint 0.1 — close 11 unauthed routes

- **Goal.** Every `app/api/*` route returns 401 for unauthenticated
  callers unless explicitly public.
- **Entry criteria.** `Claude.md` v4.0 merged; Phase 0 audit §9
  inventory complete (already in PR #8).
- **Recipe.** §6.5 Sprint 0.1 recipe. One `Explore` (medium) +
  one `Explore` (quick) in parallel; parent writes the guards;
  adversarial Playwright smoke; log entry.
- **Deliverables.**
  1. Every listed route wrapped with `assertCaseAccess` /
     `assertOrgAccess` (tenant helper arrives in 0.5).
  2. `e2e-tests/auth-smoke.spec.ts` — 11 routes, 11 × 401.
  3. `scripts/audit-auth.ts` — re-usable CI script (A-002).
  4. `EXECUTION_LOG.md` entry.
- **Smoke battery.** S-001, S-002, S-003 required green.
- **Exit criteria.** PR merged; A-002 exits 0; `BUGS.md` has a
  `superseded-by: fix` entry for any legacy auth bugs closed.
- **Timeout risks.** Playwright install in a cold sandbox; run as a
  background job.

### 10.3 Sprint 0.5 — multi-tenancy foundation

- **Goal.** `tenantId` on every business model; middleware enforces
  scoping; adversarial isolation suite green.
- **Entry criteria.** Sprint 0.1 merged; a Postgres instance
  reachable (this is the sprint's hard unblock — if not available
  the sprint *stops* until provisioned).
- **Recipe.** §6.5 Sprint 0.5.
- **Deliverables.**
  1. Migration `0002-tenancy.sql` — `Tenant`, `TenantContract`,
     `tenantId` columns + backfill to LVJ.
  2. `lib/tenants.ts` — `assertTenantAccess` + Prisma middleware.
  3. `__tests__/lib-tenants.test.ts` (unit) + adversarial isolation
     matrix in `e2e-tests/tenant-isolation.spec.ts`.
  4. `scripts/audit-tenant.ts` (A-003).
  5. `EXECUTION_LOG.md` entry + `D-NNN` if any scope decisions
     surface.
- **Smoke battery.** S-001, S-002, S-003, S-004 required green.
- **Exit criteria.** A-003 exits 0; cross-tenant query attempts log
  `AuditLog action='cross_tenant_access'`.
- **Timeout risks.** Full Prisma regen after schema changes — run
  in background.

### 10.3.1 Sprint 0.5.1 — runAuthed migration + A-003 blocking flip

- **Goal.** Every `app/api/*` route that touches Prisma enters a
  tenant context through `runAuthed(guard, handler)`. A-003 promotes
  from informational (`continue-on-error: true`) to blocking in the
  `gates` job of `.github/workflows/ci.yml`.
- **Entry criteria.** Sprint 0.5 merged (lands the `runAuthed`
  helper + Prisma client extension + A-003 audit script).
- **Deliverables.**
  1. Migration of the 24 routes reported by `scripts/audit-tenant.ts`
     to `runAuthed(...)`. Public routes (health, signup, NextAuth
     callback, terms/latest, webflow webhook) stay on the A-002
     `INTENTIONAL_PUBLIC_ROUTES` allow-list.
  2. `.github/workflows/ci.yml` — A-003 moved out of
     `continue-on-error` and into the required `gates` block.
  3. `EXECUTION_LOG.md` entry. This recipe marked landed.
- **Cribs from the 2026-04-23 cross-repo review** (`yalla-london`,
  `KhaledAun.com` — recorded in `SESSION_NOTES.md`):
  - Every financial model (`Payment`, `Commission`,
    `MarketingLead`) must carry `tenantId` at creation time — never
    inferred at read time (yalla-london CJ-001 precedent).
  - `OR: [{ tenantId }, { tenantId: null }]` backward-compat pattern
    during migration windows (yalla-london Rule 64).
  - Revenue / commission queries scope explicitly on `tenantId`
    (Rule 74).
  - `Promise.all` over 15+ Prisma queries exhausts Supabase
    PgBouncer — use sequential iteration for cross-tenant cockpits
    (Rule 9). Applies to `analytics-rollup`.
  - Additive migrations use `ALTER TABLE ADD COLUMN IF NOT EXISTS`,
    not `CREATE TABLE IF NOT EXISTS` (Rule 47).
  - `{ not: "" }` not `{ not: null }` on non-nullable `String`
    columns (Rule 3).
- **Smoke battery.** S-001, S-002, S-003, S-004 required green.
- **Exit criteria.** A-003 runs as blocking in `gates`; 0 violations
  from `scripts/audit-tenant.ts`.

### 10.4 Sprint 0.7 — AR + RTL

- **Goal.** Every landed screen renders correctly under `dir="rtl"`;
  AR strings populated for landed screens; locale switch persists
  via cookie.
- **Entry criteria.** 0.5 merged.
- **Recipe.** §6.5 Sprint 0.7.
- **Deliverables.**
  1. Logical-property codemod applied to `components/lvj/*`.
  2. `messages/ar.json` populated for landed screens.
  3. `lib/i18n-rtl.ts` helpers.
  4. Locale cookie flow across Webflow ↔ app ↔ portal.
  5. Playwright smoke S-010 (EN + AR render, RTL applied).
- **Smoke battery.** S-001, S-002, S-010 required green.
- **Exit criteria.** Visual regression baseline recorded for EN + AR.

### 10.5 Sprint 8.5 — self-serve onboarding (incl. Stripe Connect Express)

- **Goal.** A new tenant or provider can sign up, accept contract,
  complete Stripe Connect onboarding, and land in the platform with
  no concierge step. Platform-Admin verification gate for routing LVJ
  leads (R15).
- **Entry criteria.** 0.7 merged; Stripe test keys + Connect client
  id provisioned.
- **Recipe.** §6.5 Sprint 8.5.
- **Deliverables.**
  1. `app/(public)/onboarding/` wizard routes.
  2. `lib/onboarding.ts` state machine; `OnboardingProgress` writes.
  3. Stripe Connect Express onboarding via `account_links`.
  4. Platform-Admin verification screen at
     `/platform/providers/verify`.
  5. E2E happy-path + rejection-path specs.
- **Smoke battery.** S-001, S-002, S-003, S-004, S-010, S-011.
- **Exit criteria.** Provider B can onboard end-to-end against Stripe
  test mode without manual intervention; verification gate blocks
  LVJ-routed leads until approved.
- **Note (2026-04-23 cross-repo review).** Neither `yalla-london`
  nor `KhaledAun.com` carries Stripe Connect — there is no sibling
  precedent to crib. `account_links` onboarding, `return_url`
  signing, and webhook-rotation patterns come from Stripe docs +
  test mode, not from an internal repo.

### 10.6 Parallel track — Webflow webhook → MarketingLead

- **Goal.** Smallest marketing slice that unblocks attribution.
- **Entry criteria.** Can begin the moment 0.5 is in; does not wait
  on 0.7 / 8.5.
- **Deliverables.** `app/api/webhooks/webflow/route.ts` with HMAC
  verify (C-009), `MarketingLead` write, attribution classification.
- **Smoke battery.** S-009 required green.

### 10.7 AOS Phase 2 — deadline + channels + KB RAG + consent

Per `docs/AGENT_OS.md` §11. Recipe lands when we approach the sprint.
Hard pre-req: consent model on `Case.clientConsent` shipped (C-015).

### 10.8 Sprint 15 — Stripe Connect payouts + commission ledger

Per `docs/DECISIONS.md` D-016. Exit criterion: monthly
`commission-settle` cron runs against test mode without error; free-
tier expiry sweep (D-009) opens onboarding nudges 30 days prior.

Cribs from yalla-london's CJ-001 bug (see `SESSION_NOTES.md`
2026-04-23 cross-repo review): every commission / payout row MUST
carry `tenantId` at creation — never inferred at read time. Revenue
views must filter `tenantId` explicitly (Rule 74 equivalent).

### 10.9 Sprint 10 + 10.5 — Service Provider Pool + Public Directory

Per D-017. 10.5 gated on the marketing-HITL queue (D-010). Exit: ≥ 5
provider listings live on `/providers` with AR translations.

### 10.10 Remaining sprints

Execute per PRD v0.3 §6.1 phasing (Phases B → C → D → E). A new
sprint recipe lands in this file *before* the sprint starts, in the
same PR as the sprint's first commit.

---

## 11. Definition of Done — per unit of work

Unit types and their DoD. A PR that fails any row cannot merge to
`main`.

### 11.1 DoD for a code PR

- [ ] Branch name follows `claude/<feature>-<slug>` or `<author>/<slug>`.
- [ ] All §2.4 per-PR audits green (or explicitly waived with a `BUGS.md` entry).
- [ ] Per-PR smoke battery (§3.1) green.
- [ ] No hardcoded secrets (A-009).
- [ ] No new `ml-*` / `mr-*` Tailwind utilities in `components/lvj/*` (D-015 enforcement).
- [ ] `EXECUTION_LOG.md` has an entry for the head commit (D-005).
- [ ] If a contract doc changed, its version header is bumped.
- [ ] If a decision was taken in conversation, a `D-NNN` entry exists.
- [ ] If a bug is fixed, `BUGS.md` entry is moved to `fixed` with the commit SHA.
- [ ] PR description lists: tenant impact, locale impact, rollback steps.

### 11.2 DoD for a documentation-only PR

- [ ] Version header bumped on any doc changed.
- [ ] `EXECUTION_LOG.md` entry exists.
- [ ] No source code changed (enforced by CI: `git diff --name-only | grep -v '^docs/\|\.md$'` empty).
- [ ] If the doc introduces a new artefact, §1 artefact map is updated.

### 11.3 DoD for a new agent (in-product, per `docs/AGENT_OS.md` §13)

The 12-box checklist in `docs/AGENT_OS.md` §13 stands unchanged. This
plan adds three rows on top:

- [ ] Manifest declares `tenant_scope: per_tenant | platform` (new since v4.0).
- [ ] License-parity check enacted if agent may set `advice_class: attorney_approved_advice`.
- [ ] Golden fixture set covers ≥ 1 AR case (D-015).

### 11.4 DoD for a new skill

- [ ] `skills/<id>/SKILL.md` exists with YAML front-matter (§5.4 levels + AOS §6.2).
- [ ] `confidence:` starts at `experimental` or `draft`.
- [ ] Owner + `review_ttl_days` set.
- [ ] Cross-link to motivating `D-NNN` / PRD section.
- [ ] Entry added to `Claude.md` §Skills Reference table.

### 11.5 DoD for a cron / audit

- [ ] Handler at `app/api/cron/<id>/route.ts` or `services/audits/<id>.ts`.
- [ ] Vercel schedule declared in `vercel.json`.
- [ ] Writes to the correct log (§7.1 table).
- [ ] Failure opens a GitHub issue and/or appends `BUGS.md`.
- [ ] Idempotent — re-running on the same window is safe.
- [ ] Covered by at least one unit test against a fixed clock.

### 11.6 DoD for a sprint

- [ ] Every deliverable in §10 listed for that sprint is merged or
      explicitly deferred in `EXECUTION_LOG.md` rolling open items.
- [ ] The sprint's recipe in §10 is marked "landed" (move to
      "Historical recipes" section).
- [ ] The next sprint's recipe exists in §10 before this one closes.
- [ ] Quarterly review (§5.6) cadence check — if due, scheduled.

---

## 12. Open items · next actions · deferred decisions

Rolling list, scanned at the start of every session. Items move from
here to a PR's deliverables or to `BUGS.md` — never the other
direction.

### 12.1 Tooling gaps (Sprint 0.1 hard unblocks)

- [x] **`scripts/audit-auth.ts`** — A-002 (Sprint 0.1).
- [ ] **`scripts/audit-tenant.ts`** — A-003 script. Block Sprint 0.5
      merge.
- [x] **`scripts/audit-jurisdiction.ts`** — A-004 (informational).
- [x] **`scripts/audit-prisma.ts`** — C-004 additive-only schema
      audit (model_removed, field_removed, type_narrowed,
      required_tightened, array_lost detectors).
- [x] **`scripts/lint-docs.ts`** — A-010 (4 rules: source-diff →
      log, contract-doc version bump, log append-only, DECISIONS
      immutable body).
- [ ] **`scripts/smoke/<id>.ts`** — S-001 … S-013 scaffolding;
      landed incrementally per sprint.
- [x] **`scripts/pii-scrub.ts`** — centralised `scrubPii` +
      `scrubPiiDeep` (9 patterns: email, phone, passport, SSN, NIF,
      card, IBAN, DOB, IP). Wired from agents in §8 C-019.
- [x] **`.github/workflows/ci.yml`** — per-PR audit + smoke battery.
- [x] **`.claude/settings.json`** — project settings for Claude Code
      (permissions + env baseline).
- [x] **`vercel.json` cron block** — declares 11 crons (7 audits + 4
      operational). Handlers land per sprint.

### 12.2 Infrastructure gaps

- [ ] Postgres instance reachable from sandbox (blocks 0.5).
- [ ] `node_modules` installable in sandbox (blocks any real test
      run).
- [ ] Stripe test keys + Connect client id (blocks 8.5).
- [ ] Webflow Data API token + webhook secret (blocks marketing
      slice).
- [ ] ElevenLabs AR voice id (blocks AR voice in Phase 2 AOS).
- [ ] SendGrid + Twilio test credentials (blocks channel smokes).

### 12.3 Organisational gaps

- [ ] Portuguese-licensed lawyer reviewer engaged for PT skills + OA
      compliance opinion (commission compliance, Article 100).
- [ ] UAE-licensed lawyer reviewer (v1.x).
- [ ] Native AR QA reviewer added to marketing-HITL chain (D-015).
- [ ] DPO + DPA template for GDPR (Sprint 16 pre-req).
- [ ] On-call rotation defined for Sev-1 paging (C-020 + B-Sev-1).

### 12.4 Deferred decisions — await conversation

- **Data residency.** EU-only vs EU + UAE for Anthropic / OpenAI /
  Upstash. D-NNN pending; needed before Phase 2 AOS go-live.
- **Event-bus durability.** In-process `lib/events.ts` today. Phase 2
  may require Upstash QStash. D-NNN pending.
- **Per-tenant brand override.** Currently post-v1. Founder may
  accelerate.
- **Attribution dispute SLA.** `AttributionOverride` rows need an SLA
  for platform-admin response. Not yet set.
- **Quarterly review cadence confirmation.** §5.6 default is
  quarterly; confirm with founder.

### 12.5 Fresh next actions (out of this PR)

1. Review + merge this PR (`claude/execution-plan-framework-Ls8tj`).
2. Sprint 0.1 kickoff — use §10.2 recipe.
3. Write `scripts/audit-auth.ts` as Sprint 0.1's first deliverable.
4. Provision a Postgres instance (blocker for 0.5).

---

*LVJ AssistantApp — EXECUTION_PLAN.md — v1.1 — April 2026*
*Process changes edit this file.
 Architecture changes edit `Claude.md`.
 Scope changes edit `docs/PRD.md`.
 Progress → `docs/EXECUTION_LOG.md`.
 Decisions → `docs/DECISIONS.md`.
 Bugs → `docs/BUGS.md`.*





