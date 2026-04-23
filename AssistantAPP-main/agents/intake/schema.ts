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
  // D-015 · D-019 — locale is multi-valued from v1. EN + AR ship; PT is
  // accepted at the schema boundary so v1.x payloads validate, but the
  // intake skill currently produces EN/AR only.
  locale:  z.enum(['en', 'ar', 'pt']).default('en'),
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
