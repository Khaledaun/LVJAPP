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

- **Status:** accepted · 2026-04-22 · founder
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

## D-006 · Drafting owns intent; channels own delivery

- **Status:** accepted · 2026-04-22 · engineering
- **Source:** AGENT_OS.md §2 principle 7, chosen because the original
  draft had every channel agent re-prompting for its own copy (large
  prompt + legal surface, easy drift between channels).
- **Consequence:** `agents/drafting/` is the single writer; `agents/
  email/` / `agents/whatsapp/` / `agents/voice/` are deterministic
  adapters with zero LLM calls. Channel-specific length caps and
  consent live in the channel agent, not the drafter.

---

## D-007 · Design source = claude.ai/design pack, not the legacy repo

- **Status:** accepted · 2026-04-22 · founder
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

## How to add a decision

1. Grab the next `D-NNN` number.
2. Status is `proposed` until the user (or an approver) confirms, then
   `accepted`. When replaced, use `superseded-by: D-MMM`.
3. Keep it short. If a decision needs long rationale, link to a PR or
   a dedicated doc — don't inflate this file.
4. Commit the decision *with* the code that implements it. Decisions
   without code land in the same commit as the doc change that records
   them.
