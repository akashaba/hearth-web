import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const budgetSchema = z.object({
  category_id: z.string().uuid(),
  monthly_amount: z.number().positive().finite(),
  alert_threshold_pct: z.number().int().min(1).max(100).default(80),
  active: z.boolean().default(true),
})
export type BudgetInput = z.infer<typeof budgetSchema>

export const savingsGoalSchema = z.object({
  name: z.string().min(1).max(100),
  target_amount: z.number().positive().finite(),
  target_date: isoDate.nullable(),
  source_category_id: z.string().uuid().nullable(),
  starts_on: isoDate,
})
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>
