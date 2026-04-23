import { NextResponse } from 'next/server'
import { runAuthed } from '@/lib/rbac-http'
import { getManifest, isFeatureFlagEnabled } from '@/lib/agents/invoke'
import {
  subscribeAgent,
  isSubscribed,
  listSubscribed,
} from '@/lib/agents/orchestrator'

// Side-effect import: pulling this module registers every Phase-1
// agent with the invoke runtime. Must run *before* any
// `getManifest(id)` lookup.
import '@/lib/agents/register'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * `/api/agents/bootstrap`
 *
 * Binds the Phase-1 agent triggers to the event bus. Called on cold
 * start (by the first request to land on a fresh instance) and on
 * demand from `/admin` for re-subscription after a deploy.
 *
 * - `POST` — for each manifest whose `featureFlag` env var is truthy
 *   (`1` / `true` / `yes`), call `subscribeAgent(id)` if it isn't
 *   already bound. Idempotent — a second POST re-reports the current
 *   state without double-binding handlers.
 * - `GET`  — read-only introspection: which agents are subscribed
 *   right now, and which flags are visible.
 *
 * Staff-guarded via `runAuthed('staff', …)` so the public can't bind
 * or observe the agent roster. Not on the A-002 `INTENTIONAL_PUBLIC`
 * allowlist.
 */

const AGENT_IDS = ['intake', 'drafting', 'email'] as const
type AgentId = typeof AGENT_IDS[number]

interface BootstrapReport {
  ok: true
  bootstrapped: AgentId[]
  skippedDisabled: AgentId[]
  skippedAlreadyBound: AgentId[]
  skippedUnknown: AgentId[]
  subscribed: string[]
}

export async function POST(_req: Request) {
  return runAuthed('staff', async () => {
    const bootstrapped: AgentId[] = []
    const skippedDisabled: AgentId[] = []
    const skippedAlreadyBound: AgentId[] = []
    const skippedUnknown: AgentId[] = []

    for (const id of AGENT_IDS) {
      const manifest = getManifest(id)
      if (!manifest) {
        skippedUnknown.push(id)
        continue
      }
      if (!isFeatureFlagEnabled(manifest.featureFlag)) {
        skippedDisabled.push(id)
        continue
      }
      if (isSubscribed(id)) {
        skippedAlreadyBound.push(id)
        continue
      }
      subscribeAgent(id)
      bootstrapped.push(id)
    }

    const body: BootstrapReport = {
      ok: true,
      bootstrapped,
      skippedDisabled,
      skippedAlreadyBound,
      skippedUnknown,
      subscribed: listSubscribed(),
    }
    return NextResponse.json(body)
  })
}

export async function GET(_req: Request) {
  return runAuthed('staff', async () => {
    const visible = AGENT_IDS.map((id) => {
      const manifest = getManifest(id)
      return {
        id,
        known: manifest !== undefined,
        featureFlag: manifest?.featureFlag ?? null,
        featureFlagEnabled: manifest ? isFeatureFlagEnabled(manifest.featureFlag) : false,
        subscribed: isSubscribed(id),
      }
    })
    return NextResponse.json({
      ok: true,
      agents: visible,
      subscribed: listSubscribed(),
    })
  })
}
