export const CATEGORY_GROUPS = ['income', 'fixed', 'variable'] as const
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number]

export const TRANSACTION_TYPES = ['debit', 'credit'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export type SeedCategory = {
  name: string
  group: CategoryGroup
  defaultType: TransactionType
  notes?: string
}

// Canonical master list — keep in sync with supabase/seed.sql.
// Order matters: Dashboard iterates categories in this order.
export const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Salary', group: 'income', defaultType: 'credit', notes: 'Regular paycheck' },
  { name: 'Bonus', group: 'income', defaultType: 'credit' },
  { name: 'Interest Income', group: 'income', defaultType: 'credit' },
  { name: 'Refund', group: 'income', defaultType: 'credit', notes: 'Returns, reimbursements' },
  { name: 'Other Income', group: 'income', defaultType: 'credit' },
  { name: 'Rent / Mortgage', group: 'fixed', defaultType: 'debit' },
  { name: 'Utilities', group: 'fixed', defaultType: 'debit', notes: 'Electric, water, gas' },
  { name: 'Internet / Phone', group: 'fixed', defaultType: 'debit' },
  { name: 'Health Insurance', group: 'fixed', defaultType: 'debit' },
  { name: 'Car Insurance', group: 'fixed', defaultType: 'debit' },
  { name: 'Subscriptions', group: 'fixed', defaultType: 'debit', notes: 'Streaming, software, gym' },
  { name: 'Debt Payment', group: 'fixed', defaultType: 'debit', notes: 'Loans, credit card min' },
  { name: 'Investment', group: 'fixed', defaultType: 'debit', notes: 'Auto-transfer to brokerage/retirement' },
  { name: 'Savings Transfer', group: 'fixed', defaultType: 'debit', notes: 'Auto-transfer to savings' },
  { name: 'Groceries', group: 'variable', defaultType: 'debit' },
  { name: 'Restaurants', group: 'variable', defaultType: 'debit', notes: 'Dining out, takeout' },
  { name: 'Coffee', group: 'variable', defaultType: 'debit' },
  { name: 'Transportation', group: 'variable', defaultType: 'debit', notes: 'Fuel, transit, rideshare' },
  { name: 'Car Maintenance', group: 'variable', defaultType: 'debit', notes: 'Repairs, oil change' },
  { name: 'Medical', group: 'variable', defaultType: 'debit', notes: 'Doctor, pharmacy, dental' },
  { name: 'Clothing', group: 'variable', defaultType: 'debit' },
  { name: 'Household', group: 'variable', defaultType: 'debit', notes: 'Supplies, furniture' },
  { name: 'Shopping', group: 'variable', defaultType: 'debit', notes: 'General shopping' },
  { name: 'Entertainment', group: 'variable', defaultType: 'debit' },
  { name: 'Gifts', group: 'variable', defaultType: 'debit' },
  { name: 'Donations', group: 'variable', defaultType: 'debit', notes: 'Money sent to others, charity' },
  { name: 'Travel', group: 'variable', defaultType: 'debit' },
  { name: 'Education', group: 'variable', defaultType: 'debit' },
  { name: 'Miscellaneous', group: 'variable', defaultType: 'debit', notes: 'Anything uncategorized' },
]
