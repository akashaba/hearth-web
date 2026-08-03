import { z } from 'zod'
import { TRANSACTION_TYPES } from '../categories'

// A single row extracted by Gemini from a bank statement PDF.
// `suggested_category` is a category NAME (Gemini's guess from the master list) — the
// client resolves it to a category_id if possible, and the user can override in the
// review UI.
export const parsedBankRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  amount: z.number().positive().finite(),
  type: z.enum(TRANSACTION_TYPES),
  suggested_category: z.string().nullish(),
})
export type ParsedBankRow = z.infer<typeof parsedBankRowSchema>

export const bankParseResponseSchema = z.object({
  statement_period: z
    .object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    })
    .nullish(),
  transactions: z.array(parsedBankRowSchema),
})
export type BankParseResponse = z.infer<typeof bankParseResponseSchema>
