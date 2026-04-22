import 'server-only'
import { randomUUID } from 'crypto'
import { register, type AgentRunner } from '@/lib/agents/invoke'
import { runGuardrails, redactPii, isBlockedBeforeSend, type GuardrailReport } from '@/lib/agents/guardrails'
import { getPrisma } from '@/lib/db'
import { MANIFEST } from './manifest'
import { DraftingInputSchema, DraftingOutputSchema, type DraftingInput, type DraftingOutput } from './schema'

/**
 * Drafting agent runner.
 * docs/AGENT_OS.md §7.2.
 *
 * Always produces `reviewState: DRAFT`. Guardrails run post-LLM, pre-persist.
 * If hard-block conditions trigger (outcome guarantee / UPL review_required),
 * the agent emits `drafting.banned_phrase_blocked` and opens a HITL request.
 *
 * PII scrubbing runs on the final body before it is written to the DB.
 */

const PROMPT_VERSION = 'v1'

// Tiny banned-phrase list shipped inline for v1 — migrates to
// skills/drafting/banned-phrases.md in Phase 1 merge.
const BANNED_PHRASES: string[] = [
  'act now',
  'last chance',
  'pre-approved',
]

const run: AgentRunner<DraftingInput, DraftingOutput> = async (raw, ctx, tools) => {
  const input = DraftingInputSchema.parse(raw)
  tools.acc.promptVersion = PROMPT_VERSION

  await tools.audit('agent.drafting.started', {
    templateId: input.templateId, channel: input.channel,
  })

  const task =
    input.channel === 'email'    ? 'email-draft' :
    input.channel === 'whatsapp' ? 'email-draft' :  // short-form still handled by email-draft model; WhatsApp-specific routing arrives in Phase 2
                                   'email-draft'

  const resp = await tools.routeAI({
    task: task as 'email-draft',
    input: buildPrompt(input),
    locale: 'en',
    caseId: ctx.caseId,
    userId: ctx.invokerId,
  })

  const parsed = tryParseJson(resp.output)
  if (!parsed.ok) throw new Error(`drafting: LLM did not return valid JSON (${parsed.err})`)

  const { subject, body: rawBody, disclaimer } = parsed.value as {
    subject?: string; body: string; disclaimer?: string
  }

  // Guardrails.
  const report: GuardrailReport = await runGuardrails(rawBody, {
    bannedPhrases: BANNED_PHRASES,
  })

  // Redact PII before persist / send.
  const body = redactPii(rawBody)

  const blocked = isBlockedBeforeSend(report)
  if (blocked) {
    await tools.emit('drafting.banned_phrase_blocked', {
      templateId: input.templateId,
      report,
      correlationId: ctx.correlationId,
    })
    await tools.emit('hitl.requested', {
      agentId: MANIFEST.id,
      gate: {
        id: 'drafting_guardrail_fail',
        approverRole: 'LAWYER_ADMIN',
        slaHours: 8,
      },
      correlationId: ctx.correlationId,
      caseId: ctx.caseId,
      leadId: input.leadId,
      payload: { subject, body, report, templateId: input.templateId, channel: input.channel },
    })
  }

  // Persist the draft.
  const draftId = randomUUID()
  try {
    if (process.env.SKIP_DB !== '1') {
      const prisma = await getPrisma()
      await prisma.agentDraft.create({
        data: {
          id: draftId,
          agentId: MANIFEST.id,
          agentVersion: MANIFEST.version,
          correlationId: ctx.correlationId,
          caseId: input.caseId ?? null,
          leadId: input.leadId ?? null,
          templateId: input.templateId,
          channel: input.channel,
          subject: subject ?? null,
          body,
          variables: input.variables as any,
          promptVersion: PROMPT_VERSION,
          modelUsed: resp.model,
          adviceClass: 'general_information',
          reviewState: blocked ? 'PENDING_APPROVAL' : 'DRAFT',
          guardrailReport: report as any,
          createdBy: input.requestedBy,
        },
      })
    }
  } catch (err) {
    // Non-fatal for the immediate return; the AutomationLog row + audit still land.
    await tools.audit('agent.drafting.persist_failed', {
      errorMessage: String((err as Error)?.message ?? err),
    })
  }

  const output: DraftingOutput = {
    draftId,
    templateId: input.templateId,
    channel: input.channel,
    body,
    subject: subject || undefined,
    disclaimer: disclaimer || 'AI-generated — review before use.',
    reviewState: 'draft',
    generatedBy: {
      agent: 'drafting',
      version: MANIFEST.version,
      model: resp.model,
      promptVersion: PROMPT_VERSION,
      tokensUsed: resp.tokensUsed ?? 0,
      costUsd: tools.acc.costUsd,
    },
    guardrailReport: report,
  }

  await tools.emit('drafting.draft_ready', { draftId, channel: input.channel, correlationId: ctx.correlationId })
  await tools.audit('agent.drafting.completed', {
    draftId, templateId: input.templateId, channel: input.channel, blocked,
  })

  return DraftingOutputSchema.parse(output)
}

function buildPrompt(input: DraftingInput): string {
  return [
    `Template ID: ${input.templateId}`,
    `Channel: ${input.channel}`,
    `Locale: ${input.locale}`,
    'Variables:',
    JSON.stringify(input.variables, null, 2),
    '',
    'Return only the JSON object per the system prompt.',
  ].join('\n')
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; err: string } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try { return { ok: true, value: JSON.parse(trimmed) } }
  catch (e) { return { ok: false, err: (e as Error).message } }
}

register({ manifest: MANIFEST, runner: run as AgentRunner<unknown, unknown> })

export { run }
