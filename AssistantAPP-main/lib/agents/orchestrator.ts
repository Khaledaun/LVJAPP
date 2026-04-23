import 'server-only'
import { on as onEvent, type EventName } from '../events'
import { invoke, getManifest } from './invoke'
import { requestApproval } from './hitl'
import type { InvocationResult } from './types'

/**
 * Event-driven Orchestrator.
 * docs/AGENT_OS.md §5.
 *
 * Responsibilities:
 *   - Bind agent triggers (from manifest.triggers) to event-bus subscribers.
 *   - Create HITL approval rows when an agent emits `hitl.requested`.
 *   - Short-circuit downstream events tagged `blocked_by_gate` until approved.
 *   - Keep routing deterministic — the LLM classifier option is disabled by default.
 *
 * Agents do not call the orchestrator directly. Upstream callers emit events
 * via `lib/events.ts#dispatch`; the orchestrator's subscribers invoke agents.
 */

interface RouteEntry {
  agentId: string
  trigger: EventName
}

const routes: RouteEntry[] = []
const subscribed = new Set<string>()

/**
 * Register an agent's triggers with the event bus.
 *
 * Idempotent: a second call for the same `agentId` is a no-op. The
 * bootstrap route (`/api/agents/bootstrap`) and any cron-driven cold-
 * start re-binding rely on this — `on()` in `lib/events.ts` appends
 * handlers without deduping, so re-calling the un-guarded subscribe
 * would fire each trigger twice.
 */
export function subscribeAgent(agentId: string): void {
  const manifest = getManifest(agentId)
  if (!manifest) throw new Error(`subscribeAgent: unknown agent "${agentId}"`)

  if (subscribed.has(agentId)) return
  subscribed.add(agentId)

  for (const trigger of manifest.triggers) {
    const handlerId = `agent.${agentId}.trigger.${trigger}`
    onEvent(trigger as EventName, handlerId, async evt => {
      const input = (evt as any).payload ?? {}
      const ctx = {
        triggerEvent: trigger,
        caseId:     (evt as any).caseId  ?? input?.caseId,
        leadId:     input?.leadId,
        invokerId:  (evt as any).userId  ?? input?.invokerId,
        invokerRole: input?.invokerRole,
        correlationId: input?.correlationId,
      }
      await invoke(agentId, input, ctx)
    })
    routes.push({ agentId, trigger: trigger as EventName })
  }

  // hitl.requested is a convention — any agent may emit it; the orchestrator
  // turns it into an HITLApproval row. A separate subscriber keeps each agent
  // from having to know about the DB shape.
  const hitlId = `orchestrator.hitl.requested.${agentId}`
  onEvent('hitl.requested' as EventName, hitlId, async evt => {
    const p: any = (evt as any).payload ?? {}
    if (p.agentId !== agentId) return
    await requestApproval({
      agentId:       p.agentId,
      gate:          p.gate,
      correlationId: p.correlationId,
      caseId:        p.caseId,
      leadId:        p.leadId,
      draftId:       p.draftId,
      payload:       p.payload ?? {},
    })
  })
}

/** Helper for one-off direct invocations (e.g. API routes). */
export async function runAgent<O = unknown>(
  agentId: string,
  input: unknown,
  options: {
    triggerEvent: string
    caseId?: string
    leadId?: string
    invokerId?: string
    invokerRole?: string
    correlationId?: string
  },
): Promise<InvocationResult<O>> {
  return invoke<unknown, O>(agentId, input, options)
}

/** Introspection for /admin + tests. */
export function listRoutes(): Readonly<RouteEntry[]> {
  return routes
}

/** Has this agent been bound to the event bus? */
export function isSubscribed(agentId: string): boolean {
  return subscribed.has(agentId)
}

/** Subscribed agent ids, sorted — for the bootstrap route's response. */
export function listSubscribed(): string[] {
  return [...subscribed].sort()
}

/** Tests only. */
export function clearRoutes(): void {
  routes.length = 0
  subscribed.clear()
}
