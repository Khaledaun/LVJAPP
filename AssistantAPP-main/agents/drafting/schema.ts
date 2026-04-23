import { z } from 'zod'

export const DraftingInputSchema = z.object({
  caseId: z.string().optional(),
  leadId: z.string().optional(),
  templateId: z.string().min(1),
  channel: z.enum(['email', 'whatsapp', 'portal', 'letter', 'internal']),
  variables: z.record(z.string(), z.string()),
  // D-015 · D-019 — locale is multi-valued from v1. AR drafting requires a
  // native AR reviewer in marketing-HITL per D-015 before client send.
  locale: z.enum(['en', 'ar', 'pt']).default('en'),
  requestedBy: z.string().min(1),
})
export type DraftingInput = z.infer<typeof DraftingInputSchema>

export const DraftingOutputSchema = z.object({
  draftId: z.string(),
  templateId: z.string(),
  channel: z.enum(['email', 'whatsapp', 'portal', 'letter', 'internal']),
  body: z.string(),
  subject: z.string().optional(),
  disclaimer: z.string(),
  reviewState: z.literal('draft'),
  generatedBy: z.object({
    agent: z.literal('drafting'),
    version: z.string(),
    model: z.string(),
    promptVersion: z.string(),
    tokensUsed: z.number(),
    costUsd: z.number(),
  }),
  guardrailReport: z.object({
    bannedPhraseHits: z.array(z.string()),
    outcomeGuaranteeHits: z.array(z.string()),
    piiLeaks: z.array(z.object({ kind: z.string(), match: z.string() })),
    uplRisk: z.enum(['none', 'low', 'review_required']),
    toneFlags: z.array(z.string()),
  }),
})
export type DraftingOutput = z.infer<typeof DraftingOutputSchema>
