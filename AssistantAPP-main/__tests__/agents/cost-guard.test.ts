/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  addToDailyTotal, getDailyTotal, dailyBudgetUsd,
  isFrozenForAgent, enforcePerRunBudget, resetDailyTotalForTest,
} from '@/lib/agents/cost-guard'
import { CostExceededError, DurationExceededError, type RunAccumulator, type AgentBudget } from '@/lib/agents/types'

const BUDGET: AgentBudget = { maxCostUsd: 0.10, maxDurationMs: 5000, maxLlmCalls: 3 }

function acc(init: Partial<RunAccumulator> = {}): RunAccumulator {
  return { costUsd: 0, tokensIn: 0, tokensOut: 0, llmCalls: 0, modelFallbackUsed: false, escalationEvents: [], ...init }
}

describe('cost-guard — per-run budgets', () => {
  it('passes when every dimension is within budget', () => {
    expect(() => enforcePerRunBudget(acc({ costUsd: 0.02, llmCalls: 1 }), BUDGET, Date.now())).not.toThrow()
  })

  it('throws CostExceeded when cost exceeds max', () => {
    expect(() => enforcePerRunBudget(acc({ costUsd: 0.11 }), BUDGET, Date.now()))
      .toThrow(CostExceededError)
  })

  it('throws CostExceeded when llmCalls exceeds max', () => {
    expect(() => enforcePerRunBudget(acc({ llmCalls: 4 }), BUDGET, Date.now()))
      .toThrow(CostExceededError)
  })

  it('throws DurationExceeded when wall-clock exceeds max', () => {
    expect(() => enforcePerRunBudget(acc(), BUDGET, Date.now() - 6000))
      .toThrow(DurationExceededError)
  })
})

describe('cost-guard — daily firm cap', () => {
  beforeEach(() => { resetDailyTotalForTest(); delete process.env.AOS_DAILY_BUDGET_USD })

  it('no cap when env is unset', () => {
    addToDailyTotal(1000)
    expect(dailyBudgetUsd()).toBe(0)
    expect(isFrozenForAgent('intake')).toBe(false)
  })

  it('non-critical agents freeze once cap is reached', () => {
    process.env.AOS_DAILY_BUDGET_USD = '0.50'
    addToDailyTotal(0.50)
    expect(getDailyTotal()).toBeGreaterThanOrEqual(0.50)
    expect(isFrozenForAgent('intake')).toBe(true)
  })

  it('critical agents never freeze', () => {
    process.env.AOS_DAILY_BUDGET_USD = '0.01'
    addToDailyTotal(100)
    expect(isFrozenForAgent('deadline')).toBe(false)
    expect(isFrozenForAgent('orchestrator')).toBe(false)
    expect(isFrozenForAgent('hitl-gate')).toBe(false)
  })
})
