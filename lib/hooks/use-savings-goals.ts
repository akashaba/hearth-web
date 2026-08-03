'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import { useCurrentHousehold } from './use-current-household'
import { useTransactions } from './use-transactions'
import type { SavingsGoalInput } from '@/shared/schemas/budget-goal'

export type SavingsGoal = {
  id: string
  name: string
  target_amount: number
  target_date: string | null
  source_category_id: string | null
  source_category: { id: string; name: string } | null
  starts_on: string
}

export type SavingsGoalWithProgress = SavingsGoal & {
  progress: number
  progressPct: number
  remaining: number
  monthsRemaining: number | null
  monthlyPaceNeeded: number | null
}

export function useSavingsGoals(): { data: SavingsGoal[]; isLoading: boolean } {
  const supabase = useSupabase()
  const q = useAuthedQuery<SavingsGoal[]>({
    queryKey: qk.savingsGoals,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select(
          'id, name, target_amount, target_date, source_category_id, starts_on, source_category:categories!source_category_id(id, name)',
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...(r as unknown as SavingsGoal),
        target_amount: Number((r as unknown as { target_amount: string | number }).target_amount),
      })) as SavingsGoal[]
    },
  })
  return { data: q.data ?? [], isLoading: q.isLoading }
}

export function useSavingsGoalsWithProgress(): {
  data: SavingsGoalWithProgress[]
  isLoading: boolean
} {
  const { data: goals, isLoading: goalsLoading } = useSavingsGoals()
  const { data: txs = [], isLoading: txsLoading } = useTransactions()

  const data = useMemo<SavingsGoalWithProgress[]>(() => {
    const today = new Date()
    return goals.map((g) => {
      // Progress = sum of transactions in source_category since starts_on.
      // Debits count as positive progress (money moved into savings). If no source
      // category set, count nothing — user needs to pick one.
      let progress = 0
      if (g.source_category_id) {
        for (const t of txs) {
          if (t.category?.id !== g.source_category_id) continue
          if (t.date < g.starts_on) continue
          progress += t.type === 'debit' ? t.amount : -t.amount
        }
      }
      progress = Math.max(0, progress)
      const progressPct = g.target_amount > 0 ? progress / g.target_amount : 0
      const remaining = Math.max(0, g.target_amount - progress)

      let monthsRemaining: number | null = null
      let monthlyPaceNeeded: number | null = null
      if (g.target_date) {
        const target = new Date(g.target_date + 'T00:00:00')
        const months =
          (target.getFullYear() - today.getFullYear()) * 12 +
          (target.getMonth() - today.getMonth())
        monthsRemaining = Math.max(0, months)
        if (monthsRemaining > 0) {
          monthlyPaceNeeded = remaining / monthsRemaining
        } else if (remaining > 0) {
          monthlyPaceNeeded = remaining // due this month
        }
      }

      return {
        ...g,
        progress,
        progressPct,
        remaining,
        monthsRemaining,
        monthlyPaceNeeded,
      }
    })
  }, [goals, txs])

  return { data, isLoading: goalsLoading || txsLoading }
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.savingsGoals })
}

export function useCreateSavingsGoal() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SavingsGoalInput) => {
      if (!household.data) throw new Error('household not ready')
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({ ...input, household_id: household.data.id })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateSavingsGoal() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<SavingsGoalInput>) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(patch)
        .eq('id', id)
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteSavingsGoal() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}
