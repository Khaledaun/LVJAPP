import 'server-only'
import { randomUUID } from 'crypto'
import { routeAI, type AIRequest, type AIResponse } from '../ai-router'
import { getPrisma } from '../db'
import { logAuditEvent } from '../audit'
import type {
  AgentManifest,
  InvocationContext,
  InvocationResult,
  InvocationOutcome,
  RunAccumulator,
} from './types'
import {
  AgentError,
  CircuitBreakerOpenError,
  CostExceededError,
  DurationExceededError,
  HumanGateBlockedError,
  ToolNotAllowedError,
} from './types'
import * as breaker from './breaker'
import { addToDailyTotal, enforcePerRunBudget, isFrozenForAgent } from './cost-guard'

/**
 * Agent runtime entry point.
 * docs/AGENT_OS.md §5.
 *
 * Every agent is invoked here — nowhere else. Responsibilities:
 *   1. Feature-flag + circuit-breaker + daily-cap checks.
 *   2. Build an InvocationContext carrying correlationId + manifest metadata.
 *   3. Hand the agent a ToolProxy whose calls are allow-listed by manifest.
 *   4. Enforce per-run cost / duration / call budgets.
 *   5. Write exactly one AutomationLog row and one AuditLog row per run.
 *   6. Classify outcome (ok / escalated / human_blocked / circuit_broken / error)
 *      and update the circuit breaker.
 */

export interface InvokeOptions {
  triggerEvent: string
  caseId?: string
  leadId?: string
  invokerId?: string
  invokerRole?: string
  correlationId?: string
}

export type AgentRunner<I, O> = (
  input: I,
  ctx: InvocationContext,
  tools: ToolProxy,
) => Promise<O>

export interface ToolProxy {
  readonly ctx: InvocationContext
  readonly acc: RunAccumulator
  routeAI(req: AIRequest): Promise<AIResponse>
  audit(action: string, detail?: unknown): Promise<void>
  emit(eventName: string, payload: unknown): Promise<void>
  escalate(eventName: string, payload?: unknown): Promise<void>
  /** Controlled Prisma handle — checks the manifest's prismaWrites list. */
  prisma(model: string, verb: 'create' | 'update' | 'delete'): Promise<any>
}

export interface InvokeRegistry {
  manifest: AgentManifest
  runner: AgentRunner<any, any>
}

const registry: Map<string, InvokeRegistry> = new Map()

/** Called once by each agent module at import time. */
export function register(entry: InvokeRegistry): void {
  registry.set(entry.manifest.id, entry)
}

/** Tests only. */
export function unregister(id: string): void {
  registry.delete(id)
}

/** Read-only view for orchestrator / docs. */
export function getManifest(agentId: string): AgentManifest | undefined {
  return registry.get(agentId)?.manifest
}

export async function invoke<I, O>(
  agentId: string,
  input: I,
  options: InvokeOptions,
): Promise<InvocationResult<O>> {
  const entry = registry.get(agentId)
  if (!entry) {
    return immediateError('unknown_agent', `No agent registered with id "${agentId}"`)
  }

  const { manifest, runner } = entry
  const acc: RunAccumulator = {
    costUsd: 0, tokensIn: 0, tokensOut: 0, llmCalls: 0,
    modelFallbackUsed: false, escalationEvents: [],
  }

  // Feature flag.
  if (!isFeatureFlagEnabled(manifest.featureFlag)) {
    return finalize('error', acc, manifest, {
      errorClass: 'feature_flag_off',
      errorMessage: `Feature flag ${manifest.featureFlag} is disabled`,
      ctx: buildCtx(manifest, options, false),
      startedAtMs: Date.now(),
    })
  }

  // Daily firm-wide cost freeze.
  if (isFrozenForAgent(agentId)) {
    return finalize('circuit_broken', acc, manifest, {
      errorClass: 'daily_budget_frozen',
      errorMessage: 'Daily firm-wide AOS budget reached',
      ctx: buildCtx(manifest, options, true),
      startedAtMs: Date.now(),
    })
  }

  // Per-agent circuit breaker.
  if (breaker.isOpen(agentId)) {
    return finalize('circuit_broken', acc, manifest, {
      errorClass: 'circuit_open',
      errorMessage: `Circuit breaker open for "${agentId}"`,
      ctx: buildCtx(manifest, options, true),
      startedAtMs: Date.now(),
    })
  }

  const ctx = buildCtx(manifest, options, true)
  const startedAtMs = Date.now()
  const tools = buildToolProxy(manifest, ctx, acc, startedAtMs)

  try {
    const output = await runner(input, ctx, tools)
    // Last-pass budget check.
    enforcePerRunBudget(acc, manifest.budgets, startedAtMs)
    const outcome: InvocationOutcome = acc.escalationEvents.length > 0 ? 'escalated' : 'ok'
    return await finalize(outcome, acc, manifest, { ctx, startedAtMs, output })
  } catch (err) {
    return await handleError(err, manifest, acc, ctx, startedAtMs)
  }
}

// ────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────

function isFeatureFlagEnabled(flag: string): boolean {
  const v = process.env[flag]
  if (!v) return false
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes'
}

function buildCtx(
  manifest: AgentManifest,
  o: InvokeOptions,
  featureFlagEnabled: boolean,
): InvocationContext {
  return {
    agentId: manifest.id,
    agentVersion: manifest.version,
    correlationId: o.correlationId ?? randomUUID(),
    triggerEvent: o.triggerEvent,
    caseId: o.caseId,
    leadId: o.leadId,
    invokerId: o.invokerId,
    invokerRole: o.invokerRole,
    startedAt: new Date(),
    featureFlagEnabled,
  }
}

function buildToolProxy(
  manifest: AgentManifest,
  ctx: InvocationContext,
  acc: RunAccumulator,
  startedAtMs: number,
): ToolProxy {
  const allowed = new Set(manifest.toolsAllowed)

  function check(tool: string): void {
    if (!allowed.has(tool)) throw new ToolNotAllowedError(tool, manifest.id)
  }

  return {
    ctx,
    acc,

    async routeAI(req: AIRequest): Promise<AIResponse> {
      check('lib/ai-router:routeAI')
      if (!manifest.models.includes(req.task)) {
        throw new ToolNotAllowedError(`ai-router:${req.task}`, manifest.id)
      }
      // Enforce call-count ceiling *before* the call.
      if (acc.llmCalls + 1 > manifest.budgets.maxLlmCalls) {
        throw new CostExceededError(acc.costUsd, manifest.budgets.maxCostUsd)
      }
      const resp = await routeAI({
        ...req,
        caseId: req.caseId ?? ctx.caseId,
        userId: req.userId ?? ctx.invokerId,
      })
      acc.llmCalls += 1
      acc.tokensIn  += 0 // provider adapters will populate when wired
      acc.tokensOut += resp.tokensUsed ?? 0
      if (!acc.modelPrimary) acc.modelPrimary = resp.model
      // Cost sample — placeholder heuristic until provider adapters return cost.
      const estCost = estimateCost(resp)
      acc.costUsd += estCost
      addToDailyTotal(estCost)
      enforcePerRunBudget(acc, manifest.budgets, startedAtMs)
      return resp
    },

    async audit(action: string, detail?: unknown): Promise<void> {
      check('lib/audit:logAuditEvent')
      await logAuditEvent(ctx.caseId ?? null, ctx.invokerId ?? null, action, {
        ...(detail as any ?? {}),
        agentId: ctx.agentId,
        agentVersion: ctx.agentVersion,
        correlationId: ctx.correlationId,
      })
    },

    async emit(eventName: string, _payload: unknown): Promise<void> {
      if (!manifest.emits.includes(eventName)) {
        throw new ToolNotAllowedError(`emit:${eventName}`, manifest.id)
      }
      check('lib/events:dispatch')
      // Lazy import to avoid forcing server-only boundary into tests that
      // stub the runtime without events.
      const { dispatch } = await import('../events')
      await dispatch(eventName as any, _payload, {
        caseId: ctx.caseId,
        userId: ctx.invokerId,
      })
    },

    async escalate(eventName: string, payload?: unknown): Promise<void> {
      if (!manifest.escalationTriggers.includes(eventName)) {
        throw new ToolNotAllowedError(`escalate:${eventName}`, manifest.id)
      }
      acc.escalationEvents.push(eventName)
      const { dispatch } = await import('../events')
      await dispatch('escalation.raised' as any, { escalation: eventName, payload }, {
        caseId: ctx.caseId,
        userId: ctx.invokerId,
      })
    },

    async prisma(model: string, verb): Promise<any> {
      const key = `prisma:${model}.${verb}`
      if (!allowed.has(key)) throw new ToolNotAllowedError(key, manifest.id)
      const p = await getPrisma()
      // Agents receive the narrowed model client; they call the verb themselves.
      const client = (p as any)[lowerFirst(model)]
      if (!client) throw new ToolNotAllowedError(`prisma:${model}(model-missing)`, manifest.id)
      return client
    },
  }
}

async function handleError(
  err: unknown,
  manifest: AgentManifest,
  acc: RunAccumulator,
  ctx: InvocationContext,
  startedAtMs: number,
): Promise<InvocationResult> {
  let outcome: InvocationOutcome = 'error'
  let errorClass = 'unknown'
  let errorMessage = String((err as any)?.message ?? err)

  if (err instanceof HumanGateBlockedError)       { outcome = 'human_blocked'; errorClass = err.errorClass }
  else if (err instanceof CircuitBreakerOpenError){ outcome = 'circuit_broken'; errorClass = err.errorClass }
  else if (err instanceof CostExceededError
        || err instanceof DurationExceededError)  { outcome = 'circuit_broken'; errorClass = err.errorClass }
  else if (err instanceof ToolNotAllowedError)    { outcome = 'error';          errorClass = err.errorClass }
  else if (err instanceof AgentError)             { outcome = 'error';          errorClass = err.errorClass }

  return finalize(outcome, acc, manifest, { ctx, startedAtMs, errorClass, errorMessage })
}

interface FinalizeInput {
  ctx: InvocationContext
  startedAtMs: number
  output?: unknown
  errorClass?: string
  errorMessage?: string
}

async function finalize(
  outcome: InvocationOutcome,
  acc: RunAccumulator,
  manifest: AgentManifest,
  f: FinalizeInput,
): Promise<InvocationResult> {
  const durationMs = Date.now() - f.startedAtMs
  const ok = outcome === 'ok' || outcome === 'escalated' || outcome === 'human_blocked'
  breaker.record(manifest.id, ok)

  // AutomationLog — one row per invoke.
  try {
    if (process.env.SKIP_DB !== '1') {
      const prisma = await getPrisma()
      await prisma.automationLog.create({
        data: {
          agentId: manifest.id,
          agentVersion: manifest.version,
          correlationId: f.ctx.correlationId,
          triggerEvent: f.ctx.triggerEvent,
          caseId: f.ctx.caseId ?? null,
          leadId: f.ctx.leadId ?? null,
          startedAt: f.ctx.startedAt,
          durationMs,
          status: toDbStatus(outcome),
          costUsd: acc.costUsd,
          tokensIn: acc.tokensIn,
          tokensOut: acc.tokensOut,
          llmCalls: acc.llmCalls,
          promptVersion: acc.promptVersion ?? null,
          modelPrimary: acc.modelPrimary ?? null,
          modelFallbackUsed: acc.modelFallbackUsed,
          escalationEvent: acc.escalationEvents[0] ?? null,
          errorClass: f.errorClass ?? null,
          errorMessage: f.errorMessage ?? null,
        },
      })
    }
  } catch (err) {
    // AutomationLog write failures are non-fatal — never block the app.
    // eslint-disable-next-line no-console
    console.warn('[AOS] automationLog write failed:', err)
  }

  // Shared correlation id carried through to AuditLog.
  try {
    await logAuditEvent(
      f.ctx.caseId ?? null,
      f.ctx.invokerId ?? null,
      `agent.${manifest.id}.${outcome}`,
      {
        agentId: manifest.id,
        agentVersion: manifest.version,
        correlationId: f.ctx.correlationId,
        durationMs,
        costUsd: acc.costUsd,
        tokensOut: acc.tokensOut,
        llmCalls: acc.llmCalls,
        errorClass: f.errorClass,
      },
    )
  } catch { /* already non-fatal */ }

  return {
    outcome,
    output: f.output,
    errorClass: f.errorClass,
    errorMessage: f.errorMessage,
    acc,
    durationMs,
  }
}

function toDbStatus(o: InvocationOutcome): 'OK' | 'ESCALATED' | 'HUMAN_BLOCKED' | 'CIRCUIT_BROKEN' | 'ERROR' {
  switch (o) {
    case 'ok': return 'OK'
    case 'escalated': return 'ESCALATED'
    case 'human_blocked': return 'HUMAN_BLOCKED'
    case 'circuit_broken': return 'CIRCUIT_BROKEN'
    case 'error': return 'ERROR'
  }
}

function immediateError(errorClass: string, errorMessage: string): InvocationResult {
  return {
    outcome: 'error',
    errorClass,
    errorMessage,
    acc: { costUsd: 0, tokensIn: 0, tokensOut: 0, llmCalls: 0, modelFallbackUsed: false, escalationEvents: [] },
    durationMs: 0,
  }
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

// Very rough — replaced when ai-router returns per-call cost from the provider adapter.
function estimateCost(resp: AIResponse): number {
  const t = resp.tokensUsed ?? 0
  return (t / 1000) * 0.01
}
