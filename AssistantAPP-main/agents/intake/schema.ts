import { z } from 'zod'

// docs/AGENT_OS.md §7.1 — Input / Output envelope.

export const IntakeInputSchema = z.object({
  leadId:  z.string().min(1),
  answers: z.record(z.unknown()),
  attachments: z
    .array(z.object({
      gcsKey: z.string(),
      mime:   z.string(),
      label:  z.string(),
    }))
    .default([]),
  locale:  z.literal('en').default('en'),
  source:  z.string().optional(),
})
export type IntakeInput = z.infer<typeof IntakeInputSchema>

export const IntakeOutputSchema = z.object({
  leadId: z.string(),
  classification: z.object({
    serviceTypeCode: z.string(),
    confidence: z.number().min(0).max(1),
    alternatives: z.array(z.object({
      code: z.string(),
      confidence: z.number().min(0).max(1),
    })),
  }),
  eligibilityScore: z.number().min(0).max(1),
  missingFacts: z.array(z.string()),
  riskFlags: z.array(z.string()),
  documentRequestList: z.array(z.string()),
  summaryForCounsel: z.string(),
  disclaimer: z.literal('AI-generated — preliminary triage only, not legal advice.'),
})
export type IntakeOutput = z.infer<typeof IntakeOutputSchema>
