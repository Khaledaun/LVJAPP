import { z } from 'zod'

export const NewCaseSchema = z.object({
  title: z.string().min(3, 'Title is too short'),
  applicantName: z.string().min(3, 'Name is too short'),
  applicantEmail: z.string().email('Enter a valid email'),
})
export type NewCaseInput = z.infer<typeof NewCaseSchema>
