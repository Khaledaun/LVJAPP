import { z } from 'zod'

export const EmailInputSchema = z.object({
  draftId: z.string().optional(),
  to: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().min(1),
  caseId: z.string().optional(),
  leadId: z.string().optional(),
  userId: z.string().min(1),
  highRisk: z.boolean().default(false),
})
export type EmailInput = z.infer<typeof EmailInputSchema>

export const EmailOutputSchema = z.object({
  notificationLogId: z.string(),
  status: z.enum(['QUEUED', 'SENT', 'FAILED']),
  externalId: z.string().optional(),
})
export type EmailOutput = z.infer<typeof EmailOutputSchema>
