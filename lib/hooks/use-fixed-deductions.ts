'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import { useCurrentHousehold } from './use-current-household'
import type { FixedDeductionInput } from '@/shared/schemas/setup'

export type FixedDeduction = {
  id: string
  name: string
  day_of_month: number
  amount: number
  category_id: string
  category: { id: string; name: string; group_type: string } | null
  notes: string | null
  enabled: boolean
}

export function useFixedDeductions() {
  const supabase = useSupabase()
  return useAuthedQuery<FixedDeduction[]>({
    queryKey: qk.fixedDeductions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_deductions')
        .select(
          'id, name, day_of_month, amount, category_id, notes, enabled, category:categories(id, name, group_type)',
        )
        .order('day_of_month')
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...(r as unknown as FixedDeduction),
        amount: Number((r as unknown as { amount: string | number }).amount),
      })) as FixedDeduction[]
    },
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.fixedDeductions })
  qc.invalidateQueries({ queryKey: ['projected-schedule'] })
}

export function useCreateFixedDeduction() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FixedDeductionInput) => {
      if (!household.data) throw new Error('household not ready')
      const { data, error } = await supabase
        .from('fixed_deductions')
        .insert({ ...input, household_id: household.data.id })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateFixedDeduction() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<FixedDeductionInput>) => {
      const { data, error } = await supabase
        .from('fixed_deductions')
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

export function useDeleteFixedDeduction() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_deductions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}
