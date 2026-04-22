import 'server-only'
import { logAuditEvent } from './audit'

/**
 * Multi-LLM AI Router.
 *
 * Golden Rule #3 (CLAUDE.md): "No direct AI API calls in routes — always route
 * through lib/ai-router.ts."
 *
 * This file is the Sprint 0 scaffold. The routing table is complete and the
 * public surface (routeAI) is stable. Model adapters (anthropic, openai,
 * google, mistral) are wired in later sprints — each adapter lives in
 * lib/ai-providers/<name>.ts and registers via registerProvider().
 *
 * Fallback chain: primary → fallback → NOT_IMPLEMENTED error.
 * Every call is logged via lib/audit.ts and (later) written to AutomationLog.
 */

export type AITask =
  | 'ocr-passport'
  | 'ocr-document'
  | 'rfe-draft'
  | 'legal-analysis'
  | 'approval-odds'
  | 'form-prefill'
  | 'eligibility-score'
  | 'translation-check'
  | 'social-copy'
  | 'email-draft'
  | 'batch-analysis'
  | 'deadline-check'

export type ModelId =
  | 'gemini-2.5-pro'
  | 'gpt-5'
  | 'gpt-4o'
  | 'claude-3-7-sonnet'
  | 'mistral-large'

export interface AIRequest {
  task: AITask
  input: string | { text?: string; imageUrl?: string }
  locale?: 'en' | 'ar' | 'pt'
  caseId?: string
  userId?: string
  stream?: boolean
}

export interface AIResponse {
  output: string
  model: ModelId
  tokensUsed?: number
  durationMs?: number
  cached?: boolean
}

interface RouteSpec {
  primary: ModelId
  fallback: ModelId
  rationale: string
}

export const ROUTING_TABLE: Record<AITask, RouteSpec> = {
  'ocr-passport':       { primary: 'gemini-2.5-pro',    fallback: 'gpt-4o',             rationale: 'Vision + multilingual' },
  'ocr-document':       { primary: 'gemini-2.5-pro',    fallback: 'gpt-4o',             rationale: 'Long context, vision' },
  'rfe-draft':          { primary: 'gpt-5',             fallback: 'claude-3-7-sonnet',  rationale: 'Legal writing' },
  'legal-analysis':     { primary: 'claude-3-7-sonnet', fallback: 'gpt-5',              rationale: 'Complex reasoning' },
  'approval-odds':      { primary: 'gpt-5',             fallback: 'gemini-2.5-pro',     rationale: 'Structured output' },
  'form-prefill':       { primary: 'gpt-5',             fallback: 'gemini-2.5-pro',     rationale: 'JSON structured output' },
  'eligibility-score':  { primary: 'gemini-2.5-pro',    fallback: 'gpt-5',              rationale: 'Multilingual quiz' },
  'translation-check':  { primary: 'mistral-large',     fallback: 'gemini-2.5-pro',     rationale: 'Cost-efficient batch' },
  'social-copy':        { primary: 'gpt-5',             fallback: 'claude-3-7-sonnet',  rationale: 'Copywriting' },
  'email-draft':        { primary: 'claude-3-7-sonnet', fallback: 'gpt-5',              rationale: 'Nuanced communication' },
  'batch-analysis':     { primary: 'mistral-large',     fallback: 'gemini-2.5-pro',     rationale: 'Cost optimization' },
  'deadline-check':     { primary: 'claude-3-7-sonnet', fallback: 'gpt-5',              rationale: 'Policy interpretation' },
}

export type ProviderFn = (model: ModelId, req: AIRequest) => Promise<AIResponse>

const providers: Map<ModelId, ProviderFn> = new Map()

/** Register a model adapter. Called from lib/ai-providers/<name>.ts at module load. */
export function registerProvider(model: ModelId, fn: ProviderFn): void {
  providers.set(model, fn)
}

export function isProviderRegistered(model: ModelId): boolean {
  return providers.has(model)
}

/** For tests. */
export function clearProviders(): void {
  providers.clear()
}

class ProviderNotImplementedError extends Error {
  constructor(model: ModelId) {
    super(`AI provider not implemented: ${model}`)
    this.name = 'ProviderNotImplementedError'
  }
}

async function callOrThrow(model: ModelId, req: AIRequest): Promise<AIResponse> {
  const fn = providers.get(model)
  if (!fn) throw new ProviderNotImplementedError(model)
  const started = Date.now()
  const out = await fn(model, req)
  return { ...out, durationMs: out.durationMs ?? Date.now() - started }
}

/**
 * Route an AI request through the primary model, falling back on failure.
 * Every attempt is audited. Caller receives the first successful response;
 * if both primary and fallback fail, the primary error is re-thrown.
 */
export async function routeAI(req: AIRequest): Promise<AIResponse> {
  const spec = ROUTING_TABLE[req.task]
  if (!spec) throw new Error(`Unknown AI task: ${req.task}`)

  try {
    const resp = await callOrThrow(spec.primary, req)
    await logAuditEvent(req.caseId, req.userId, 'ai.route.ok', {
      task: req.task, model: resp.model, tokens: resp.tokensUsed, durationMs: resp.durationMs,
    })
    return resp
  } catch (primaryErr: any) {
    await logAuditEvent(req.caseId, req.userId, 'ai.route.primary_failed', {
      task: req.task, model: spec.primary, error: primaryErr?.message ?? String(primaryErr),
    })
    try {
      const resp = await callOrThrow(spec.fallback, req)
      await logAuditEvent(req.caseId, req.userId, 'ai.route.fallback_ok', {
        task: req.task, model: resp.model, tokens: resp.tokensUsed, durationMs: resp.durationMs,
      })
      return resp
    } catch (fallbackErr: any) {
      await logAuditEvent(req.caseId, req.userId, 'ai.route.fallback_failed', {
        task: req.task, model: spec.fallback, error: fallbackErr?.message ?? String(fallbackErr),
      })
      throw primaryErr
    }
  }
}
