import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const setupSchema = z.object({
  starting_balance: z.number().finite(),
  starting_balance_date: isoDate,
  paycheck_amount: z.number().nonnegative().finite(),
  paycheck_category_id: z.string().uuid().nullable(),
  first_payday: isoDate.nullable(),
})
export type SetupInput = z.infer<typeof setupSchema>

export const fixedDeductionSchema = z.object({
  name: z.string().min(1).max(100),
  day_of_month: z.number().int().min(1).max(31),
  amount: z.number().nonnegative().finite(),
  category_id: z.string().uuid(),
  notes: z.string().max(500).nullish(),
  enabled: z.boolean().default(true),
})
export type FixedDeductionInput = z.infer<typeof fixedDeductionSchema>
