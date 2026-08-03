'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import { useCurrentHousehold } from './use-current-household'
import type { SetupInput } from '@/shared/schemas/setup'

export type Setup = {
  household_id: string
  starting_balance: number
  starting_balance_date: string
  paycheck_amount: number
  paycheck_category_id: string | null
  first_payday: string | null
}

export function useSetup() {
  const supabase = useSupabase()
  return useAuthedQuery<Setup | null>({
    queryKey: qk.setup,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setup')
        .select(
          'household_id, starting_balance, starting_balance_date, paycheck_amount, paycheck_category_id, first_payday',
        )
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        ...(data as unknown as Setup),
        starting_balance: Number((data as unknown as { starting_balance: string | number }).starting_balance),
        paycheck_amount: Number((data as unknown as { paycheck_amount: string | number }).paycheck_amount),
      } as Setup
    },
  })
}

export function useUpsertSetup() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SetupInput) => {
      if (!household.data) throw new Error('household not ready')
      const { data, error } = await supabase
        .from('setup')
        .upsert({ ...input, household_id: household.data.id }, { onConflict: 'household_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.setup })
      qc.invalidateQueries({ queryKey: ['projected-schedule'] })
      qc.invalidateQueries({ queryKey: ['monthly-summary'] })
    },
  })
}
