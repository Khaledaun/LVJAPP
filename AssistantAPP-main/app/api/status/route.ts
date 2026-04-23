import { NextResponse } from 'next/server'
import { runAuthed } from '@/lib/rbac-http'
import { validateEnv } from '@/lib/env-validate'
import { csrfMode } from '@/lib/csrf'
import { rateLimitMode } from '@/lib/rate-limit'
import { isFeatureFlagEnabled, getManifest } from '@/lib/agents/invoke'
import { isSubscribed, listSubscribed } from '@/lib/agents/orchestrator'

// Side-effect: registers every Phase-1 agent with the invoke runtime so
// `getManifest(id)` can resolve their feature-flag names.
import '@/lib/agents/register'

// `/api/status`
//
// Staff-only deploy introspection. Answers "is this environment
// configured right, and which feature flags are actually live?" in
// one GET. Unlike `/api/health` (which is public and only exposes
// `{ ok, db, time }`), this endpoint leaks enough detail — env
// warnings, subscribed agents, rollout-mode strings — that it needs
// the staff guard.
//
// Read-only: never mutates state. Separate from `/api/agents/bootstrap`
// GET (which is agents-only) because an operator checking "is prod
// healthy?" wants DB + env + flags in one response, not three round-
// trips.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const AGENT_IDS = ['intake', 'drafting', 'email'] as const

export async function GET(_req: Request) {
  return runAuthed('staff', async () => {
    // Env validator — never throws; returns { errors, warnings }.
    const env = validateEnv()

    // Agents snapshot. `isFeatureFlagEnabled` and `isSubscribed` are
    // cheap in-memory lookups; no DB.
    const agents = AGENT_IDS.map((id) => {
      const manifest = getManifest(id)
      return {
        id,
        known: manifest !== undefined,
        featureFlag: manifest?.featureFlag ?? null,
        featureFlagEnabled: manifest ? isFeatureFlagEnabled(manifest.featureFlag) : false,
        subscribed: isSubscribed(id),
      }
    })

    // Rollout-mode flags — same source of truth used by the middleware.
    const flags = {
      csrfMode: csrfMode(),
      rateLimitMode: rateLimitMode(),
    }

    // Git SHA — best-effort. Vercel sets VERCEL_GIT_COMMIT_SHA at
    // build time; fall back to SOURCE_COMMIT / GIT_COMMIT for other
    // deploys.
    const gitSha =
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.SOURCE_COMMIT ??
      process.env.GIT_COMMIT ??
      null

    // Overall health: true iff env has no errors (warnings are OK).
    // Flag-flip readiness is encoded per-flag in the env warnings.
    const ok = env.errors.length === 0

    return NextResponse.json({
      ok,
      time: new Date().toISOString(),
      environment: env.environment,
      gitSha,
      env: {
        errors: env.errors,
        warnings: env.warnings,
      },
      flags,
      agents: {
        subscribed: listSubscribed(),
        known: agents,
      },
    })
  })
}
