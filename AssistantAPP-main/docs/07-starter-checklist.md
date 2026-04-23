# 07 — Starter Checklist (Day 1 / Week 1 / Month 1)

Do these in order. Don't skip ahead — every item downstream assumes the earlier ones are true.

## Day 1 — Foundation

- [ ] Create the repo. Name it `lvjapp`. Default branch `main`, protected. Require status checks and one review.
- [ ] `pnpm init`; set up pnpm workspace with `apps/` and `packages/`.
- [ ] Create `apps/web` (public) and `apps/dashboard` (authenticated) as Next.js 14 App Router projects. TypeScript strict.
- [ ] Create shared packages: `auth`, `db`, `schemas`, `env`, `ui`, `utils`.
- [ ] Add `CLAUDE.md` at the repo root: conventions, tooling policy (agents may explore, not mutate git or `DEVLOG.md`), links to `docs/lvjapp/*`.
- [ ] Add `.claude/settings.json`, `.claude/agents/`, `.mcp.json`. Seed with at least one agent (e.g., `code-reviewer`).
- [ ] Add a Prisma schema in `packages/db` with a single `User` model + `AuditLog` model. Run initial migration.
- [ ] Export the Prisma singleton from `packages/db/index.ts`.
- [ ] Create `packages/env` with a Zod-validated env loader. Fail fast on missing required vars.
- [ ] Add `.env.example` covering the matrix in `docs/lvjapp/03-operations-and-deployment.md`.
- [ ] Add `/api/health` returning `{ ok, commit, dbLatency, timestamp }` to both apps.
- [ ] Add ESLint rules: no `any`, no physical CSS properties in `apps/`, no `new PrismaClient()` outside `packages/db`.
- [ ] Add Prettier + EditorConfig.
- [ ] Set up GitHub Actions: typecheck, lint, test, build on every PR.
- [ ] Create `scripts/preflight.sh` with the 14 checks. Wire it into CI and the release process.
- [ ] Make the first commit on branch `main`, push to GitHub. Tag `v0.0.0`.

## Week 1 — Auth, RLS, CI/CD, observability

- [ ] Wire Supabase Auth. Email + password; one OAuth provider.
- [ ] Implement `requireAuth`, `requireRole`, `requireOwnership` in `packages/auth`.
- [ ] Turn on RLS for every user-data table at the moment you create it. Write RLS policies alongside the migration.
- [ ] Add CSRF middleware with no content-type exemption.
- [ ] Add rate-limit middleware — in-memory for dev, Upstash Redis for prod. Key by user then rightmost XFF.
- [ ] Structured JSON logger (`createLogger({ component })`). Include `trace_id`, no PII in logs.
- [ ] Audit-log every mutation. Append-only table; `before`/`after` diff; classification tag.
- [ ] i18n setup (if multi-lingual): `next-intl` with `generateStaticParams` + `force-dynamic` on data pages + `localePrefix: 'as-needed'`.
- [ ] RTL: add `dir="rtl"` root, Heebo font, logical CSS guard-rail lint, `ltr` utility class, `rtl-flip` icon utility. (Skip if single-language.)
- [ ] Deploy both apps to Vercel. Set env vars for Production, Preview, Development. Verify `/api/health` from each domain.
- [ ] Set up UptimeRobot against `/api/health` on prod and preview.
- [ ] Set up Sentry (optional but recommended for the dashboard app).
- [ ] Write the first real E2E test: login → create record → read back → logout. Run on every PR in CI.
- [ ] Document the deploy steps in `docs/DEPLOY.md` with the checklist from `03-operations-and-deployment.md`.

## Month 1 — First product features, AI, backups

- [ ] Define the 2–3 core entities of your product. Add Prisma models + RLS + Zod schemas in `packages/schemas`.
- [ ] Build CRUD for each: list, detail, create form, edit, delete (soft-delete preferred). All behind `requireAuth`. Every form has a write → read-back test.
- [ ] Build the AI feature that is your differentiator. Route it through `runAIRequest()` from day 1:
  - consent gate
  - PII redaction (input + output)
  - cost ceiling (daily + monthly, per tier)
  - circuit breaker
  - citation verifier (if it cites sources)
  - tenant-scoped memory (STM + rolling LTM)
- [ ] Wire Supabase PITR (Tier 1 backup, if plan allows).
- [ ] Build the Tier 2 daily backup: encrypted export → S3 (il-central-1 or wherever your residency requires).
- [ ] Build the DSR function: one call, deletes/anonymizes a user across every table. Test it.
- [ ] Build the admin audit-log viewer. Filter by user, entity, time, action.
- [ ] Write the Data Inventory (`docs/DATA_INVENTORY.md`): every table/column, classification, retention.
- [ ] Run a preflight-green deploy. Tag `v0.1.0`. Write release notes.
- [ ] Schedule the first DR drill for end of month 3. Put it in the team calendar now.

## Ongoing — cadences

- **Weekly:** dependency updates (Dependabot/Renovate), quick security triage, cost dashboard review.
- **Monthly:** rotate non-user secrets (CRON_SECRET, CSRF_SECRET) with zero-downtime overlap. Update AI token pricing constants. Review access logs for admin accounts.
- **Quarterly:** DR drill (restore from Tier 2, run smoke, time it). Red-team-of-one day. Re-run evals against frozen fixtures. Review and prune skills/ references.
- **Yearly:** external pentest. Review data retention; delete what you can. SOC 2 drift check if applicable. Review env matrix and secrets inventory end-to-end.

## Traps to post on the team wall

1. "Just mark it `force-dynamic`." (Any route that reads DB.)
2. "`?pgbouncer=true` on port 6543 for runtime, port 5432 for migrations."
3. "Prisma is a singleton. No exceptions."
4. "`NEXT_PUBLIC_*` = build-time. Set before build, redeploy by new commit."
5. "Pass `locale` to `NextIntlClientProvider` always."
6. "Logical CSS only. `ms`/`me`/`ps`/`pe`/`text-start`/`text-end`."
7. "CSRF has no content-type exemption."
8. "Rightmost `X-Forwarded-For`, or prefer `x-real-ip`."
9. "PII-redact before any LLM call that persists."
10. "Every mutation gets an audit row."
11. "Agents explore. They don't commit, push, merge, or edit DEVLOG."

If the team lives by those 11 and this checklist, `lvjapp` will spend its time on product instead of the fixes we had to ship.
