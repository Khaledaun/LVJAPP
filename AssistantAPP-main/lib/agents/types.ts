import type { AITask } from '../ai-router'

/**
 * Shared types for the Agent Operating System.
 * Contract defined in docs/AGENT_OS.md §4.
 */

export type AgentTier = 'service' | 'workflow' | 'channel' | 'surface' | 'background' | 'growth'
export type AgentType = 'rag' | 'orchestrator' | 'workflow' | 'conversational' | 'ui' | 'cron'
export type AgentStatus = 'draft' | 'alpha' | 'beta' | 'ga' | 'deprecated'

export interface AgentBudget {
  maxCostUsd: number
  maxDurationMs: number
  maxLlmCalls: number
}

export interface AgentHITLGate {
  id: string
  approverRole: string
  slaHours: number
  /** Human-readable rule; evaluation lives in agent code. */
  rule?: string
}

export interface AgentManifest {
  id: string
  name: string
  version: string
  status: AgentStatus
  owner: string
  tier: AgentTier
  type: AgentType
  triggers: string[]
  emits: string[]
  toolsAllowed: string[]
  models: AITask[]
  rbacScope: {
    invoker: string[]
    actsOnBehalfOf: string[]
  }
  vaultAccess: boolean
  prismaWrites: string[]
  humanGates: AgentHITLGate[]
  budgets: AgentBudget
  escalationTriggers: string[]
  kpis: { name: string; target: string }[]
  kb: { core: string; agent: string }
  featureFlag: string
}

/** Canonical envelope every agent invocation sees. */
export interface InvocationContext {
  agentId: string
  agentVersion: string
  correlationId: string
  triggerEvent: string
  caseId?: string
  leadId?: string
  invokerId?: string
  invokerRole?: string
  startedAt: Date
  featureFlagEnabled: boolean
}

/** Per-run accumulator (budget + telemetry). */
export interface RunAccumulator {
  costUsd: number
  tokensIn: number
  tokensOut: number
  llmCalls: number
  modelPrimary?: string
  modelFallbackUsed: boolean
  escalationEvents: string[]
  promptVersion?: string
}

export type InvocationOutcome =
  | 'ok'
  | 'escalated'
  | 'human_blocked'
  | 'circuit_broken'
  | 'error'

export interface InvocationResult<T = unknown> {
  outcome: InvocationOutcome
  output?: T
  errorClass?: string
  errorMessage?: string
  acc: RunAccumulator
  durationMs: number
}

export class AgentError extends Error {
  constructor(
    message: string,
    readonly errorClass: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

export class ToolNotAllowedError extends AgentError {
  constructor(tool: string, agentId: string) {
    super(`Tool "${tool}" not in tools_allowed for agent "${agentId}"`, 'tool_not_allowed')
  }
}

export class CostExceededError extends AgentError {
  constructor(costUsd: number, limit: number) {
    super(`Cost ${costUsd.toFixed(4)} USD exceeded budget ${limit.toFixed(4)} USD`, 'cost_exceeded')
  }
}

export class DurationExceededError extends AgentError {
  constructor(ms: number, limit: number) {
    super(`Duration ${ms}ms exceeded budget ${limit}ms`, 'duration_exceeded')
  }
}

export class HumanGateBlockedError extends AgentError {
  constructor(gateId: string) {
    super(`Blocked on human gate "${gateId}"`, 'human_blocked')
  }
}

export class CircuitBreakerOpenError extends AgentError {
  constructor(agentId: string) {
    super(`Circuit breaker open for agent "${agentId}"`, 'circuit_broken')
  }
}
