'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import { useCurrentHousehold } from './use-current-household'
import { useTransactions } from './use-transactions'
import type { CategoryGroup } from '@/shared/categories'
import type { BudgetInput } from '@/shared/schemas/budget-goal'

export type Budget = {
  id: string
  category_id: string
  monthly_amount: number
  alert_threshold_pct: number
  active: boolean
  category: { id: string; name: string; group_type: CategoryGroup } | null
}

export type BudgetWithProgress = Budget & {
  spentThisMonth: number
  progressPct: number // 0..1+ (can exceed 1 when over budget)
  remaining: number
  status: 'ok' | 'warning' | 'over'
}

export function useBudgets(): { data: Budget[]; isLoading: boolean } {
  const supabase = useSupabase()
  const q = useAuthedQuery<Budget[]>({
    queryKey: qk.budgets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select(
          'id, category_id, monthly_amount, alert_threshold_pct, active, category:categories(id, name, group_type)',
        )
        .order('created_at')
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...(r as unknown as Budget),
        monthly_amount: Number((r as unknown as { monthly_amount: string | number }).monthly_amount),
      })) as Budget[]
    },
  })
  return { data: q.data ?? [], isLoading: q.isLoading }
}

/**
 * Budgets joined with current-month spend per budgeted category.
 * `progressPct` can exceed 1.0 when over budget. `status` transitions:
 *   ok      < alert_threshold_pct%
 *   warning ≥ alert_threshold_pct% and < 100%
 *   over    ≥ 100%
 */
export function useBudgetsWithProgress(): {
  data: BudgetWithProgress[]
  isLoading: boolean
} {
  const { data: budgets, isLoading: budgetsLoading } = useBudgets()
  const { data: txs = [], isLoading: txsLoading } = useTransactions()

  const data = useMemo<BudgetWithProgress[]>(() => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth() + 1

    const spendByCategory = new Map<string, number>()
    for (const t of txs) {
      if (t.type !== 'debit') continue
      const parts = t.date.split('-')
      if (Number(parts[0]) !== thisYear || Number(parts[1]) !== thisMonth) continue
      const cid = t.category?.id
      if (!cid) continue
      spendByCategory.set(cid, (spendByCategory.get(cid) ?? 0) + t.amount)
    }

    return budgets.map((b) => {
      const spent = spendByCategory.get(b.category_id) ?? 0
      const pct = b.monthly_amount > 0 ? spent / b.monthly_amount : 0
      const status: BudgetWithProgress['status'] =
        pct >= 1 ? 'over' : pct * 100 >= b.alert_threshold_pct ? 'warning' : 'ok'
      return {
        ...b,
        spentThisMonth: spent,
        progressPct: pct,
        remaining: b.monthly_amount - spent,
        status,
      }
    })
  }, [budgets, txs])

  return { data, isLoading: budgetsLoading || txsLoading }
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.budgets })
}

export function useCreateBudget() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BudgetInput) => {
      if (!household.data) throw new Error('household not ready')
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...input, household_id: household.data.id })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateBudget() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<BudgetInput>) => {
      const { data, error } = await supabase.from('budgets').update(patch).eq('id', id).select('id').single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteBudget() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}
