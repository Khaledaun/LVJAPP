/**
 * Cost guard — per-run budget enforcement + daily firm-wide cap.
 * docs/AGENT_OS.md §9.2.
 *
 * Per-run limits come from the agent manifest and are enforced in
 * `invoke.ts` via the RunAccumulator. This module also tracks a rolling
 * daily total (in-process) across agents — when `AOS_DAILY_BUDGET_USD`
 * is exceeded, non-critical agents are paused until the next UTC midnight.
 *
 * Critical agents (deadline, escalation routing) are allow-listed to keep
 * running during a cost freeze — they protect legal obligations.
 */

import type { AgentBudget, RunAccumulator } from './types'
import { CostExceededError, DurationExceededError } from './types'

const CRITICAL_AGENTS = new Set(['deadline', 'orchestrator', 'hitl-gate'])

interface DailyTotals { dateKey: string; totalUsd: number }
let daily: DailyTotals = { dateKey: todayKey(), totalUsd: 0 }

function todayKey(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10) // YYYY-MM-DD UTC
}

function rollIfNewDay(at: Date = new Date()): void {
  const k = todayKey(at)
  if (k !== daily.dateKey) { daily = { dateKey: k, totalUsd: 0 } }
}

/** Add to the daily total and return the post-add total. */
export function addToDailyTotal(costUsd: number, at: Date = new Date()): number {
  rollIfNewDay(at)
  daily.totalUsd += costUsd
  return daily.totalUsd
}

export function getDailyTotal(at: Date = new Date()): number {
  rollIfNewDay(at)
  return daily.totalUsd
}

/** Firm-wide daily cap from env. 0 or unset = no cap. */
export function dailyBudgetUsd(): number {
  const raw = process.env.AOS_DAILY_BUDGET_USD
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Should the agent be paused because of the daily cap? */
export function isFrozenForAgent(agentId: string, at: Date = new Date()): boolean {
  if (CRITICAL_AGENTS.has(agentId)) return false
  const cap = dailyBudgetUsd()
  if (cap <= 0) return false
  return getDailyTotal(at) >= cap
}

/** Throws if the per-run budget is exceeded. Updates acc in place. */
export function enforcePerRunBudget(
  acc: RunAccumulator,
  budget: AgentBudget,
  startedAtMs: number,
): void {
  if (acc.costUsd > budget.maxCostUsd) {
    throw new CostExceededError(acc.costUsd, budget.maxCostUsd)
  }
  if (acc.llmCalls > budget.maxLlmCalls) {
    throw new CostExceededError(acc.costUsd, budget.maxCostUsd)
  }
  const elapsed = Date.now() - startedAtMs
  if (elapsed > budget.maxDurationMs) {
    throw new DurationExceededError(elapsed, budget.maxDurationMs)
  }
}

/** Test / ops helper. */
export function resetDailyTotalForTest(): void {
  daily = { dateKey: todayKey(), totalUsd: 0 }
}
