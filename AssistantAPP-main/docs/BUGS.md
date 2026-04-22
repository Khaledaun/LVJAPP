# Bugs & Fixes Log

> Single source of truth for known defects, their severity, and their
> fix status. Counterpart of `docs/DECISIONS.md`, same discipline:
> **bugs are appended, never edited in place** — a fix is a new entry
> that supersedes the original, and the original's status flips to
> `fixed` (or `wontfix` / `superseded-by: B-MMM`) with a link.
>
> Rules, severity scale, auto-population, and review cadence live in
> `docs/EXECUTION_PLAN.md` §4. Read that first.
>
> **Update trigger.** A bug is discovered (manual report, smoke
> failure, audit cron, guardrail incident, CVE scan, user report, or
> security review).

---

## How to add an entry

Copy the template below. Keep each entry under ~15 lines; link out
(PR, commit, D-NNN, A-NNN) for anything longer. Sev-1 entries must
also page the on-call per `docs/DECISIONS.md` D-013.

```
## B-NNN · <one-line title> · Sev-<N> · <status> · <YYYY-MM-DD> · <reporter>

- **Discovered by:** <commit SHA | smoke id | audit id | user report | agent guardrail incident | review>
- **Affected:** <file paths · routes · models · agents · tenants>
- **Reproduction:** <minimal command or steps; "N/A" only if genuinely not reproducible>
- **Root cause:** <one paragraph; null if not yet diagnosed>
- **Fix:** <commit SHA(s) · PR # · or "pending">
- **Related:** <D-NNN · other B-NNN · A-NNN audit id · threat id from EXECUTION_PLAN §8.2>
- **Tenant impact:** <which tenants were / could have been exposed; "none" if N/A>
- **Locale impact:** <EN · AR · PT · "none">
```

Status values (per `docs/EXECUTION_PLAN.md` §4.2):

| Status                | Meaning                                                       |
|-----------------------|---------------------------------------------------------------|
| `open`                | Reported, not yet triaged                                     |
| `triaged`             | Severity + owner assigned; not yet fixed                      |
| `in_progress`         | PR branch exists; under active work                           |
| `fixed`               | Merged to `main`; smoke regression added                      |
| `wontfix`             | Accepted trade-off; `reason:` line required                   |
| `superseded-by: B-MMM`| Another entry replaces this one (rare — usually `fixed`)      |

Severity (from `docs/EXECUTION_PLAN.md` §4.1):

| Sev   | Example                                                          | Triage SLA | Fix SLA                  |
|-------|------------------------------------------------------------------|------------|--------------------------|
| Sev-1 | Tenant-isolation breach · auth bypass · secret exposed · data loss | 15 min     | 24 h, branch from `main` |
| Sev-2 | Crashing load-bearing flow · failed cron · exploitable CVE       | 1 h        | 5 business days          |
| Sev-3 | UX defect · stale doc · jurisdiction audit hit                   | 1 b-day    | Next sprint              |
| Sev-4 | Nice-to-have · refactor candidate                                | —          | Backlog                  |

---

## Open Sev-1 / Sev-2 (review daily)

*No open Sev-1 or Sev-2 bugs at the time of this file's creation.*

The following operational debt is tracked in `docs/EXECUTION_LOG.md`
rolling open items and `docs/EXECUTION_PLAN.md` §12, not here —
these are deferred deliverables, not defects:

- Postgres not reachable from sandbox (capacity, not defect).
- `node_modules` not installed in sandbox (capacity, not defect).
- 11 legacy API routes lack auth guards — scheduled for Sprint 0.1.
  *This is the first known defect surface*; individual `B-NNN`
  entries will be opened per route as Sprint 0.1 triages them.

---

## Closed / Sev-3 / Sev-4 / historical

*None yet.*

---

## B-000 · Seed entry — this file exists

- **Discovered by:** `docs/EXECUTION_PLAN.md` §4 introduced the log
- **Affected:** N/A — meta entry
- **Reproduction:** `ls docs/BUGS.md`
- **Root cause:** Prior to this PR, bugs had no persistent home;
  smoke / audit failures would have surfaced only in an ad-hoc
  comment on a PR or a Slack message. `docs/EXECUTION_PLAN.md` §4.4
  binds the smoke harness and audit crons to auto-append entries
  here.
- **Fix:** This file + the contract in `EXECUTION_PLAN.md` §4.
  Scripts that auto-append (`scripts/smoke/report-failures.ts`,
  audit cron handlers) land as they're built per §12 Tooling Gaps.
- **Related:** D-022 · `EXECUTION_PLAN.md` §4 · A-002 / A-003 / A-009
- **Status:** `fixed` — the log exists.
- **Tenant impact:** none.
- **Locale impact:** none.

---

## Conventions

- **Grep-friendly.** Always start a line with `## B-NNN ·` so a full
  repo grep for `^## B-` lists every bug.
- **Immutable history.** Never delete a bug entry. If it turns out to
  have been mis-reported, append a new entry flipping the status to
  `wontfix` with `reason: misreported`.
- **Correlation id.** If a bug was discovered via a runtime log,
  include the `correlationId` in the `Discovered by:` line — it is
  the single fastest way to pull the full cross-log trace (see
  `docs/EXECUTION_PLAN.md` §7.2).
- **PII in bug text.** Never paste raw PII into an entry. Use
  redacted forms (`email: j****@example.com`) or reference the vault
  key.

---

*LVJ AssistantApp — BUGS.md — seeded April 2026*
*Format rules live in `docs/EXECUTION_PLAN.md` §4.*
