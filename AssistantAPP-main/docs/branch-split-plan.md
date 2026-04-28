# Branch split plan — `claude/post-0.7-a-005-dynamic-audit-X4mBc`

The branch carries **22 commits / +5,699 lines / -472 lines / 71 files**
(Sprint 0.7.5 post-0.7 cleanup). Reviewing as one unit is
expensive. Below is a recommended split into **3 sub-PRs** that
each merge clean to `main` independently and keep the audit
contracts intact.

> **Status.** This is a planning artefact, not yet executed. The
> branch as a whole is in a green state (every audit passes); a
> reviewer can elect to merge it as one PR, or follow the recipe
> below to land it in three.

## Sub-PR A · Audit framework + cleanup (foundation)

**Theme.** Everything that establishes the *gates* that the rest
of the work depends on. Mergeable on its own; doesn't change any
runtime behaviour beyond adding new audits.

**Commits (in order):**

1. `92383c4` — Post-0.7 cleanup: A-005 dynamic-route audit (D-025 §4)
2. `54576a5` — D-026: audit numbering reconciliation
3. `b35ac0a` — A-011 KB freshness audit script
4. `f536702` — Migrate 14 LEGACY SKILL.md frontmatters to v0.1
5. `0408833` — Audit library refactor (lib/audits/ split)

**Net change.** +1 required CI gate (A-005), +1 informational CI
gate (A-011), +1 D-NNN entry (D-026), plan version bump 1.1 → 1.2,
14 SKILL.md frontmatters expanded, 5 audit scripts split into
library + thin CLI.

**Risk.** Low. Pure additive instrumentation + frontmatter
migration + mechanical refactor. No runtime route or middleware
changes.

**Cherry-pick recipe:**

```bash
git checkout main
git checkout -b claude/audit-framework-foundation
git cherry-pick 92383c4 54576a5 b35ac0a f536702 0408833
git push -u origin claude/audit-framework-foundation
```

## Sub-PR B · Cron + middleware runtime

**Theme.** Everything that adds new runtime surfaces:
`/api/cron/*` handlers, `/api/agents/bootstrap`, `/api/status`,
`/api/health` 503 change, CSRF + rate-limit middleware wiring. Every
flag defaults `off`, so behaviour is byte-identical until an
operator flips them.

**Depends on:** Sub-PR A merged (uses `lib/audits/*`).

**Commits (in order):**

1. `370ba60` — runCron helper + scripts/preflight.sh
2. `52dacdc` — CSRF + rate-limit scaffolding (libs only)
3. `659cd1f` — CSRF rollout: middleware wiring (`CSRF_MODE`)
4. `ccccf14` — Rate-limit rollout: middleware wiring (`RATE_LIMIT_MODE`)
5. `3832822` — Agent bootstrap + idempotent `subscribeAgent`
6. `d9c3514` — 4 cron handlers (auth/tenant/jurisdiction/kb)
7. `9c20f73` — Route-level CSRF Playwright smoke
8. `135e35a` — Cron issue-opener + wire A-002
9. `652a143` — Wire A-011 cron to issue-opener
10. `6496091` — `/api/status` + `/api/health` 503

**Net change.** +6 routes (4 crons, bootstrap, status), +1 health
behaviour change (200→503 on DB down), CSRF + rate-limit live in
middleware (default off). +1 `lib/audits/issue-opener.ts`. +1
`lib/cron.ts`. +1 `lib/csrf.ts`. +1 `lib/rate-limit.ts`. +1
`scripts/preflight.sh`.

**Risk.** Medium. The middleware adds `/api/:path*` to its matcher
— any API call now traverses CSRF + rate-limit dispatch (both no-op
when their mode env is `off`, which is the default). The
`/api/health` 503 change is a behaviour break for any existing
uptime monitor that was treating 200-with-`db:'error'` as healthy
— but that monitor was already broken; the 503 is the fix.

**Smoke after merge.** `curl /api/health` → 200; staff GET
`/api/status` → 200 with `ok: true`; POST `/api/agents/bootstrap`
without flags → `bootstrapped: []`.

## Sub-PR C · Workflows + env + plan refresh

**Theme.** GitHub Actions workflows (A-008 / A-010 weekly), env
validator + preflight integration, plan §10 / §12 refresh.

**Depends on:** Sub-PR A merged. Independent of Sub-PR B (no shared
files except `docs/EXECUTION_LOG.md` which append-cleanly).

**Commits (in order):**

1. `a9cb5b3` — `.github/workflows/a008-deps.yml`
2. `4facef3` — `.github/workflows/a010-doc-discipline.yml`
3. `0957181` — Env validator + `npm run env:check`
4. `6a4da77` — Refresh `EXECUTION_PLAN.md` §12 to post-0.7 reality
5. `feee736` — Docs: post-0.7 cleanup sprint entry + progress snapshot
6. `28e95dc` — Tests for `/api/agents/bootstrap`
7. `77a45ff` — Parity tests for A-003/A-004/A-011 cron handlers

**Net change.** +2 GH Actions workflows, +1 env validator
(`lib/env-validate.ts` + `scripts/check-env.ts`), plan §10.4.1
Sprint 0.7.5 entry + §12 checklist refresh, +3 test files.

**Risk.** Low. Additive workflows + an env-validator helper that
nothing imports automatically; tests don't change runtime
behaviour.

## Why this split (not others)

- **By theme, not commit order.** The temporal order of my commits
  has interleaved themes (e.g., the A-008 workflow lands after
  cron handlers but is conceptually independent). The split groups
  by what reviewers and ops people care about together.
- **Each sub-PR is independently mergeable to `main`.** No commit
  in C depends on B; B depends on A only because it imports
  `lib/audits/*`.
- **Three is the right number.** Two would put the cron / middleware
  surface (high-risk) in the same PR as the audit framework
  (low-risk), making the audit-framework review wait on the
  middleware review. Four would isolate the issue-opener
  unnecessarily — it's a small file with strong cohesion to the
  cron handlers it serves.

## Conflict surface

The three sub-PRs touch some shared files:

- `package.json` (script additions). Cherry-picking each PR adds
  its own scripts; conflicts at merge time are line-additive and
  resolve trivially.
- `docs/EXECUTION_LOG.md` (append-only; A-010-R3 enforces). Each
  sub-PR appends its own dated entries; conflicts at merge time
  are positional, resolve by keeping both blocks.
- `docs/EXECUTION_PLAN.md` (plan version + §10 / §12 sections).
  Sub-PRs A and C both touch it; A bumps 1.1 → 1.2 (D-026), C
  edits §10 / §12. If A merges first, C rebases cleanly. If C
  merges first, A's bump still goes through (1.2 stays).
- `docs/DECISIONS.md` (A-010-R4 immutable). Only Sub-PR A touches
  it (D-026 entry). Append-only; no conflict.

## If you'd rather merge as one PR

The branch is green end-to-end. Squash-merging `claude/post-0.7-
a-005-dynamic-audit-X4mBc` into `main` lands all 22 commits as a
single Sprint 0.7.5 unit. Trade-off: one large diff for review
vs. three smaller ones with sub-PR overhead.
