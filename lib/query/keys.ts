export type TxFilters = {
  start?: string
  end?: string
  category_id?: string
  account_id?: string
  type?: 'debit' | 'credit'
}

export const qk = {
  household: ['household'] as const,
  categories: ['categories'] as const,
  accounts: ['accounts'] as const,
  transactions: (filters?: TxFilters) => ['transactions', filters ?? {}] as const,
  monthlySummary: (year: number) => ['monthly-summary', year] as const,
  categoryBreakdown: (year: number, month: number) =>
    ['category-breakdown', year, month] as const,
  cashflowForecast: (days: number) => ['cashflow-forecast', days] as const,
  projectedSchedule: (year: number, month: number) =>
    ['projected-schedule', year, month] as const,
  setup: ['setup'] as const,
  fixedDeductions: ['fixed-deductions'] as const,
  budgets: ['budgets'] as const,
  savingsGoals: ['savings-goals'] as const,
  debts: ['debts'] as const,
  debt: (id: string) => ['debt', id] as const,
  recurringSuggestions: ['recurring-suggestions'] as const,
  assistantConversations: ['assistant-conversations'] as const,
  assistantConversation: (id: string) => ['assistant-conversation', id] as const,
  receipt: (id: string) => ['receipt', id] as const,
}
