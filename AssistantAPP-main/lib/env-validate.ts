/**
 * Startup env validator.
 *
 * Read-only: inspects `process.env`, returns a `{ warnings, errors }`
 * report. Does NOT mutate or throw. Callers decide what to do with
 * the output — the CLI (`scripts/check-env.ts`) prints + exits on
 * errors; a deploy script can check `report.errors.length` before
 * promoting; a future `/api/status` route can surface the warnings
 * to staff.
 *
 * Rule levels:
 *   - **error**   — deploy would be broken or insecure. Examples:
 *     `CRON_SECRET` unset in production, `NEXTAUTH_SECRET` unset
 *     in production.
 *   - **warning** — deploy runs but a feature is off or downgraded.
 *     Examples: `CSRF_MODE=enforce` but `NEXT_PUBLIC_APP_URL` unset
 *     (Origin check will trip on same-origin requests);
 *     `RATE_LIMIT_MODE=enforce` without Upstash (per-instance only);
 *     agent flags on without `GITHUB_TOKEN` for the issue-opener.
 *
 * Dev (NODE_ENV !== 'production') downgrades every error to a
 * warning, so `SKIP_DB=1` / `SKIP_AUTH=1` dev loops stay noise-
 * free.
 *
 * Used by `scripts/check-env.ts`. Called from `/api/status` once
 * that route lands (staff-guarded; do NOT surface env warnings on
 * public `/api/health`).
 */

export interface EnvFinding {
  level: 'error' | 'warning'
  key: string
  message: string
}

export interface EnvReport {
  environment: 'production' | 'preview' | 'development' | 'test' | 'unknown'
  findings: EnvFinding[]
  errors: EnvFinding[]
  warnings: EnvFinding[]
}

type Env = Record<string, string | undefined>

interface Rule {
  level: 'error' | 'warning'
  key: string
  check: (env: Env) => string | null
}

const RULES: Rule[] = [
  {
    level: 'error',
    key: 'NEXTAUTH_SECRET',
    check: (env) => (env.NEXTAUTH_SECRET ? null : 'unset — sessions will not sign'),
  },
  {
    level: 'error',
    key: 'CRON_SECRET',
    check: (env) =>
      env.CRON_SECRET
        ? null
        : 'unset — every /api/cron/* handler returns 500 cron_misconfigured',
  },
  {
    level: 'warning',
    key: 'NEXTAUTH_URL',
    check: (env) =>
      env.NEXTAUTH_URL || env.VERCEL_URL
        ? null
        : 'unset and no VERCEL_URL fallback — callbacks may hit localhost',
  },
  {
    level: 'warning',
    key: 'DATABASE_URL',
    check: (env) =>
      env.DATABASE_URL ? null : 'unset — Prisma will throw on first query',
  },
  {
    level: 'warning',
    key: 'DIRECT_URL',
    check: (env) =>
      env.DIRECT_URL
        ? null
        : 'unset — `prisma migrate deploy` will use the pooler (D-025 forbids)',
  },
  {
    level: 'warning',
    key: 'CSRF_MODE',
    check: (env) => {
      const mode = (env.CSRF_MODE ?? 'off').toLowerCase()
      if (mode === 'off') return null
      if (mode === 'enforce' && !env.NEXT_PUBLIC_APP_URL) {
        return "CSRF_MODE=enforce without NEXT_PUBLIC_APP_URL — Origin check uses req.url's host which may differ behind a proxy"
      }
      return null
    },
  },
  {
    level: 'warning',
    key: 'RATE_LIMIT_MODE',
    check: (env) => {
      const mode = (env.RATE_LIMIT_MODE ?? 'off').toLowerCase()
      if (mode !== 'enforce') return null
      if (!env.UPSTASH_REDIS_REST_URL && !env.UPSTASH_REDIS_REST_TOKEN) {
        return 'RATE_LIMIT_MODE=enforce without Upstash — in-memory counter is per-instance only, ineffective across Edge regions'
      }
      return null
    },
  },
  {
    level: 'warning',
    key: 'GITHUB_TOKEN',
    check: (env) =>
      env.GITHUB_TOKEN
        ? null
        : 'unset — cron audit issue-opener runs in log-only mode (no real issues created)',
  },
  {
    level: 'warning',
    key: 'GITHUB_REPOSITORY',
    check: (env) =>
      env.GITHUB_TOKEN && !env.GITHUB_REPOSITORY && !env.CRON_ISSUE_OPENER_REPO
        ? 'token set but repo slug missing — issue-opener can\'t resolve a target repo'
        : null,
  },
]

function detectEnvironment(env: Env): EnvReport['environment'] {
  const v = (env.VERCEL_ENV ?? env.NODE_ENV ?? '').toLowerCase()
  if (v === 'production') return 'production'
  if (v === 'preview') return 'preview'
  if (v === 'development') return 'development'
  if (v === 'test') return 'test'
  return 'unknown'
}

export function validateEnv(env: Env = process.env): EnvReport {
  const environment = detectEnvironment(env)
  const isProd = environment === 'production'

  const findings: EnvFinding[] = []
  for (const rule of RULES) {
    const message = rule.check(env)
    if (!message) continue
    // Dev downgrades every rule to a warning so SKIP_DB / SKIP_AUTH loops
    // stay quiet.
    const level = !isProd ? 'warning' : rule.level
    findings.push({ level, key: rule.key, message })
  }

  const errors = findings.filter((f) => f.level === 'error')
  const warnings = findings.filter((f) => f.level === 'warning')
  return { environment, findings, errors, warnings }
}
