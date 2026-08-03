import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const DEBT_TYPES = [
  'credit_card',
  'student_loan',
  'mortgage',
  'auto',
  'personal',
  'other',
] as const
export type DebtType = (typeof DEBT_TYPES)[number]

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit card',
  student_loan: 'Student loan',
  mortgage: 'Mortgage',
  auto: 'Auto loan',
  personal: 'Personal loan',
  other: 'Other',
}

export const debtSchema = z.object({
  name: z.string().min(1).max(80),
  debt_type: z.enum(DEBT_TYPES),
  original_balance: z.number().positive().finite(),
  apr: z.number().min(0).lt(1), // 0.0499 = 4.99% APR (stored as decimal fraction)
  monthly_payment: z.number().positive().finite(),
  first_payment_date: isoDate,
  category_id: z.string().uuid().nullable(),
  fixed_deduction_id: z.string().uuid().nullable(),
  notes: z.string().max(500).nullable(),
  active: z.boolean().default(true),
})
export type DebtInput = z.infer<typeof debtSchema>
