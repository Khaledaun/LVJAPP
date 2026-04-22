/**
 * Per-agent error-rate circuit breaker.
 * docs/AGENT_OS.md §9.3.
 *
 * In-process rolling window (5 minutes, ≥ 10 samples). When error rate
 * crosses the threshold the breaker opens for `cooldownMs`, during which
 * invokes short-circuit with `CircuitBreakerOpenError`.
 *
 * Phase 2+ will replace this with a durable (Upstash) implementation so
 * trips survive deploys — see docs/AGENT_OS.md §14.1.
 */

const WINDOW_MS     = 5 * 60 * 1000
const MIN_SAMPLES   = 10
const ERROR_THRESHOLD = 0.20
const COOLDOWN_MS   = 10 * 60 * 1000

interface Sample { at: number; ok: boolean }
interface State  { samples: Sample[]; openUntil: number }

const state: Map<string, State> = new Map()

function get(agentId: string): State {
  let s = state.get(agentId)
  if (!s) { s = { samples: [], openUntil: 0 }; state.set(agentId, s) }
  return s
}

function prune(s: State, now: number): void {
  const cutoff = now - WINDOW_MS
  while (s.samples.length && s.samples[0].at < cutoff) s.samples.shift()
}

export function isOpen(agentId: string, now: number = Date.now()): boolean {
  return get(agentId).openUntil > now
}

export function record(agentId: string, ok: boolean, now: number = Date.now()): void {
  const s = get(agentId)
  prune(s, now)
  s.samples.push({ at: now, ok })
  if (s.samples.length < MIN_SAMPLES) return
  const errors = s.samples.filter(x => !x.ok).length
  const rate = errors / s.samples.length
  if (rate > ERROR_THRESHOLD && s.openUntil <= now) {
    s.openUntil = now + COOLDOWN_MS
  }
}

/** Test / ops helper. */
export function reset(agentId?: string): void {
  if (agentId) state.delete(agentId)
  else state.clear()
}

/** Test / ops helper. */
export function forceOpen(agentId: string, ms: number = COOLDOWN_MS): void {
  get(agentId).openUntil = Date.now() + ms
}

export const __config = { WINDOW_MS, MIN_SAMPLES, ERROR_THRESHOLD, COOLDOWN_MS }
