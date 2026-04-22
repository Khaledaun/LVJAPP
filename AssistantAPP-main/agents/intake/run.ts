import 'server-only'
import { register, type AgentRunner, type ToolProxy } from '@/lib/agents/invoke'
import type { InvocationContext } from '@/lib/agents/types'
import { MANIFEST } from './manifest'
import { IntakeInputSchema, IntakeOutputSchema, type IntakeInput, type IntakeOutput } from './schema'

/**
 * Intake agent runner.
 * docs/AGENT_OS.md §7.1.
 *
 * Receives a lead payload, asks the AI router for a structured classification
 * + eligibility score, emits risk escalations, opens a HITL approval when
 * the gate rule matches, and writes the lead row.
 *
 * The prompt lives at prompts/intake/v1.md. When bumping versions, add
 * prompts/intake/v2.md, refresh the golden fixtures, and bump
 * MANIFEST.version accordingly.
 */

const PROMPT_VERSION = 'v1'

const run: AgentRunner<IntakeInput, IntakeOutput> = async (raw, ctx, tools) => {
  const input = IntakeInputSchema.parse(raw)
  tools.acc.promptVersion = PROMPT_VERSION

  await tools.audit('agent.intake.started', { leadId: input.leadId, source: input.source })

  // Single LLM call to classify + score. The prompt instructs strict JSON.
  const resp = await tools.routeAI({
    task: 'eligibility-score',
    input: buildPrompt(input),
    locale: 'en',
    caseId: ctx.caseId,
    userId: ctx.invokerId,
  })

  const parsed = tryParseJson(resp.output)
  if (!parsed.ok) {
    throw new Error(`intake: LLM did not return valid JSON (${parsed.err})`)
  }

  // Force-set leadId and disclaimer — never trust the model on these.
  const candidate: IntakeOutput = {
    ...(parsed.value as IntakeOutput),
    leadId: input.leadId,
    disclaimer: 'AI-generated — preliminary triage only, not legal advice.',
  }
  const output = IntakeOutputSchema.parse(candidate)

  // Surface risk flags as typed escalation events. These count toward the
  // outcome classification ('escalated') even if the agent otherwise succeeds.
  await raiseEscalations(output.riskFlags, tools)

  // HITL gate — open an approval row when the rule fires.
  const gate = MANIFEST.humanGates.find(g => g.id === 'before_case_creation')!
  const shouldBlock = output.eligibilityScore < 0.6 || output.riskFlags.length > 0
  if (shouldBlock) {
    await tools.emit('hitl.requested', {
      agentId: MANIFEST.id,
      gate,
      correlationId: ctx.correlationId,
      caseId: ctx.caseId,
      leadId: input.leadId,
      payload: {
        summaryForCounsel: output.summaryForCounsel,
        riskFlags: output.riskFlags,
        eligibilityScore: output.eligibilityScore,
        classification: output.classification,
      },
    })
  }

  // Persist the lead update via the controlled Prisma handle.
  const lead = await tools.prisma('EligibilityLead', 'update')
  try {
    await lead.update({
      where: { id: input.leadId },
      data: {
        score: output.eligibilityScore,
        visaCategory: output.classification.serviceTypeCode,
        status: shouldBlock ? 'CONTACTED' : 'NEW',
        answers: input.answers as any,
      },
    })
  } catch (err) {
    // Non-fatal — we still return the triage result for the human queue.
    await tools.audit('agent.intake.lead_update_failed', {
      leadId: input.leadId, errorMessage: String((err as Error)?.message ?? err),
    })
  }

  await tools.emit('intake.draft_ready', {
    leadId: input.leadId,
    correlationId: ctx.correlationId,
    summaryForCounsel: output.summaryForCounsel,
    serviceTypeCode: output.classification.serviceTypeCode,
  })

  await tools.audit('agent.intake.completed', {
    leadId: input.leadId,
    serviceTypeCode: output.classification.serviceTypeCode,
    eligibilityScore: output.eligibilityScore,
    riskFlags: output.riskFlags,
    blocked: shouldBlock,
  })

  return output
}

function buildPrompt(input: IntakeInput): string {
  const header = `Lead ID: ${input.leadId}\nLocale: ${input.locale}\nAttachments: ${input.attachments.length}\n`
  const answers = `Answers:\n${JSON.stringify(input.answers, null, 2)}\n`
  return [
    header,
    answers,
    'Return only the JSON object per the system prompt. Do not explain. Do not wrap in code fences.',
  ].join('\n')
}

async function raiseEscalations(riskFlags: string[], tools: ToolProxy): Promise<void> {
  const map: Record<string, string> = {
    criminal_history:      'escalation.criminal_history',
    prior_refusal:         'escalation.prior_refusal',
    urgent_deadline:       'escalation.urgent_deadline',
    inconsistent_identity: 'escalation.inconsistent_identity',
    distressed_client:     'escalation.distressed_client',
    fraud_indicator:       'escalation.fraud_indicator',
  }
  for (const flag of riskFlags) {
    const ev = map[flag]
    if (ev) await tools.escalate(ev, { flag })
  }
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; err: string } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try { return { ok: true, value: JSON.parse(trimmed) } }
  catch (e) { return { ok: false, err: (e as Error).message } }
}

// Self-register on import.
register({ manifest: MANIFEST, runner: run as AgentRunner<unknown, unknown> })

// Optional: avoid unused-import linter complaints for InvocationContext in types.
export type _Ctx = InvocationContext

export { run }
