# 03 — Operations & Deployment

## Environment matrix (copy this shape)

| Var | Production | Preview | Development | Required | Notes |
|-----|-----------|---------|-------------|----------|-------|
| `DATABASE_URL` | pooler, `:6543?pgbouncer=true&connection_limit=1` | same | local | ✅ | Prisma runtime |
| `DIRECT_URL` | direct, `:5432` | same | local | ✅ | Prisma migrate |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | prod | local | ✅ | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | prod | local | ✅ | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | prod | local | ✅ | **Server-only** |
| `NEXTAUTH_SECRET` / `SESSION_SECRET` | 32-byte random | same | local | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` / `APP_URL` | `https://app.lvj...` | preview URL | `http://localhost:3000` | ✅ | Absolute URL |
| `CSRF_SECRET` | 32-byte random | same | local | ✅ | |
| `CRON_SECRET` | 32-byte random | same | local | ✅ | Guards `/api/cron/*` |
| `ANTHROPIC_API_KEY` | prod | prod | dev | ⚠️ | Scoped / budget-capped |
| `OPENAI_API_KEY` | prod | prod | dev | ⚠️ | Optional |
| `RESEND_API_KEY` | prod | prod | dev | ⚠️ | Email |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | prod | prod | (unset) | ✅ prod | Rate limiting in prod |
| `SENTRY_DSN` | prod | prod | (unset) | ⚠️ | Error tracking |

Keep this table in `docs/ENV.md` and update it whenever you add a var. Validate all of it via `packages/env` with Zod on import — fail loudly if a required var is missing.

## Preflight script (`scripts/preflight.sh`)

We wrote ~47 checks in `pre-flight-check.sh` / `.ps1` on this project. The ones that actually caught real failures:

1. Required CLIs present: `node`, `pnpm`, `git`, `vercel`, `supabase`, `psql`.
2. `.env.local` exists and parses.
3. All required env vars present (drive from the matrix above).
4. `pnpm install` succeeded (no peer warnings that matter).
5. `pnpm prisma generate` succeeds.
6. `pnpm prisma db push --preview-feature --dry-run` shows no unexpected drift.
7. DB reachable: `psql "$DATABASE_URL" -c 'select 1'`.
8. DB reachable via pooler AND direct — test both.
9. `pnpm typecheck` clean.
10. `pnpm lint` clean (includes RTL logical-property rule).
11. `pnpm test` clean.
12. `pnpm build` clean (catches `force-dynamic` misses).
13. `/api/health` returns 200 against the local build.
14. Git tree clean and on the expected branch.

Exit non-zero on any failure. Script returns 0 = you're allowed to deploy.

## Deployment checklist (per release)

- [ ] PR merged to `main`; CI green.
- [ ] `CHANGELOG.md` updated; release notes drafted.
- [ ] `pnpm preflight` green locally.
- [ ] Env vars diffed between Production / Preview / Development.
- [ ] Supabase: migrations applied (`prisma migrate deploy` via Vercel build step or manual).
- [ ] Smoke: health endpoint returns `{ ok: true }` on both staging and prod.
- [ ] Smoke: create → read → update → delete on one protected entity.
- [ ] i18n smoke: hit `/en`, `/he`, `/ar` (or your locales) in incognito.
- [ ] Security smoke: CSRF-less POST returns 403; bad `CRON_SECRET` returns 401.
- [ ] Tag: `vX.Y.Z`. Push tag. Create GitHub Release.
- [ ] UptimeRobot shows green for 15 min post-deploy.
- [ ] Sentry shows no new error clusters.

## Monitoring

| Tool | Purpose | Tier |
|------|---------|------|
| Vercel Analytics | Page views, Web Vitals | Free |
| UptimeRobot | `/api/health` every 5 min, email alerts | Free |
| Supabase Dashboard | Query perf, pool usage, DB size | Free |
| Sentry | Errors + perf + session replay on dashboard | Free 5k events/mo |
| Cost dashboard (custom) | Daily/monthly AI spend per tenant | Build it |

**Alert thresholds worth setting:**
- `/api/health` response > 30 s → page.
- 5xx rate > 1% over 5 min → page.
- DB pool utilization > 80% → warn.
- AI daily spend > 80% of cap → warn; > 100% → block further calls.
- New device login on an admin account → email the admin (we built this; worth it).

## Git / branch / PR workflow

- **Branch names:** `feat/<slug>`, `fix/<slug>`, `ops/<slug>`, `docs/<slug>`, `chore/<slug>`. For AI-assisted work we use `claude/<slug>-<rand>` and *only push to that branch*. Never let an agent push to `main`.
- **PRs require:** green CI, one human review, linked issue/ticket.
- **Merge strategy:** squash to `main`. Keep `main` linear.
- **Tags:** semver (`v0.1.0`, `v0.2.0-rc.1`). Optional trailing phase tag (`-p6-lite`) if you version features separately.
- **Protected branches:** `main`, `release/*`. Require status checks, disallow force-push.
- **Never `--no-verify` / `--no-gpg-sign`** unless explicitly told to. Fix the hook instead of bypassing it.

## Disaster recovery — 3-2-1 from day 1

**Target RPO/RTO:**

| Scenario | RTO | RPO |
|----------|-----|-----|
| Full system failure | 4 hours | 24 hours |
| DB corruption | 2 hours | 1 hour |
| Single table restore | 30 min | 24 hours |
| Document blob recovery | 15 min | 1 week |

**Backup tiers:**

| Tier | Cadence | Retention | Mechanism |
|------|---------|-----------|-----------|
| 1 | continuous PITR | 14 days | Supabase Team plan |
| 2 | daily encrypted export | 1 year | S3 (il-central-1) |
| 3 | monthly cold | 7 years | Backblaze B2 (eu-central) |

Encrypt with AES-256-GCM at the application layer before upload; never trust the provider's "server-side encryption" alone. Enable Object Lock + MFA delete on the S3 bucket.

**Quarterly drill:** restore to an isolated project from Tier 2, run smoke tests, document RTO actually achieved. No drill, no real DR capability.

## Incident response (P1→P4)

| Priority | Definition | RTO | Pager |
|----------|-----------|-----|-------|
| P1 | System down / data loss / active breach | 4 h | Yes |
| P2 | Major feature down / DB corruption | 2 h | Yes |
| P3 | Partial degradation | 30 min | Business hours |
| P4 | Single-record / cosmetic | 15 min | Next day |

Five phases, on a shared doc template:
1. **Assess** (≤15 min) — scope, affected users, open a comms channel.
2. **Contain** — isolate; preserve evidence; rotate secrets if there's any chance they leaked.
3. **Recover** — from backup, from cache, from replica.
4. **Verify** — integrity checks, synthetic workflow tests, monitor for 1 h.
5. **Communicate + post-mortem** — user notice (Amendment 13 requires 72 h for breaches), status page, blameless post-mortem within a week.

## Useful scripts to replicate in lvjapp

| Script | Purpose |
|--------|---------|
| `scripts/preflight.sh` | The 14 checks above. Gate for deploy. |
| `scripts/migrate-prod.sh` | `prisma migrate deploy` + smoke test |
| `scripts/seed.ts` | Idempotent dev/staging seed data |
| `scripts/backup-verify.ts` | Pull latest Tier 2 backup, restore to tmp DB, run integrity checks |
| `scripts/env-diff.ts` | Diff prod/preview/dev env vars; alert if production is missing something preview has |
| `scripts/rotate-secrets.ts` | Rotate CSRF/CRON/session secrets + redeploy |
| `scripts/import-content.ts` | Bulk import (we used this for WordPress blog migration; pattern reuses) |

## Running services locally (PM2 pattern worth copying)

On this project we keep a `pm2.config.js` that runs the site + dashboard on fixed ports so devs don't collide. Codespaces reboot? `pm2 resurrect`. Works for solo and team dev.

```
pm2 status
pm2 logs <app>
pm2 restart <app>
```

Keeps "what's running where on my machine" out of the bug report.
