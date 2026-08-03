import { z } from 'zod'
import { TRANSACTION_TYPES } from '../categories'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const transactionInsertSchema = z.object({
  date: isoDate,
  description: z.string().min(1, 'Required').max(200),
  category_id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount: z.number().positive('Must be > 0').finite(),
  type: z.enum(TRANSACTION_TYPES),
  notes: z.string().max(1000).nullish(),
  receipt_id: z.string().uuid().nullish(),
})
export type TransactionInput = z.infer<typeof transactionInsertSchema>

export const transactionUpdateSchema = transactionInsertSchema.partial().extend({
  id: z.string().uuid(),
})
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>
