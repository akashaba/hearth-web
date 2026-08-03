'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { useCurrentHousehold } from './use-current-household'
import type { TransactionInput } from '@/shared/schemas/transaction'

// Any KPI or aggregate query keys should be invalidated on transaction mutations.
const DERIVED_KEYS = [
  ['transactions'],
  ['monthly-summary'],
  ['category-breakdown'],
  ['cashflow-forecast'],
] as const

function invalidateDerived(qc: ReturnType<typeof useQueryClient>) {
  for (const key of DERIVED_KEYS) qc.invalidateQueries({ queryKey: key as unknown as readonly unknown[] })
}

export function useCreateTransaction() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!household.data) throw new Error('household not ready')
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...input, household_id: household.data.id })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateDerived(qc),
  })
}

export function useUpdateTransaction() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<TransactionInput>) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateDerived(qc),
  })
}

export function useDeleteTransaction() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateDerived(qc),
  })
}
