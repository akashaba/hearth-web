'use client'

import { useSupabase } from '@/lib/supabase/browser'
import { qk, type TxFilters } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import type { CategoryGroup, TransactionType } from '@/shared/categories'

export type TransactionRow = {
  id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  notes: string | null
  receipt_id: string | null
  category: { id: string; name: string; group_type: CategoryGroup } | null
  account: { id: string; name: string } | null
}

export function useTransactions(filters: TxFilters = {}) {
  const supabase = useSupabase()
  return useAuthedQuery<TransactionRow[]>({
    queryKey: qk.transactions(filters),
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select(
          `id, date, description, amount, type, notes, receipt_id,
           category:categories(id, name, group_type),
           account:accounts(id, name)`,
        )
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)
      if (filters.start) q = q.gte('date', filters.start)
      if (filters.end) q = q.lte('date', filters.end)
      if (filters.category_id) q = q.eq('category_id', filters.category_id)
      if (filters.account_id) q = q.eq('account_id', filters.account_id)
      if (filters.type) q = q.eq('type', filters.type)
      const { data, error } = await q
      if (error) throw error
      // Supabase returns the amount as string for numeric() columns unless coerced.
      return (data ?? []).map((r) => ({
        ...(r as unknown as TransactionRow),
        amount: typeof (r as unknown as { amount: unknown }).amount === 'string'
          ? Number((r as unknown as { amount: string }).amount)
          : (r as unknown as TransactionRow).amount,
      })) as TransactionRow[]
    },
  })
}
