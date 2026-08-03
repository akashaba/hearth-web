'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import { useCurrentHousehold } from './use-current-household'

export type Account = { id: string; name: string }

export function useAccounts() {
  const supabase = useSupabase()
  return useAuthedQuery<Account[]>({
    queryKey: qk.accounts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as Account[]
    },
  })
}

export function useCreateAccount() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      if (!household.data) throw new Error('no household')
      const { data, error } = await supabase
        .from('accounts')
        .insert({ household_id: household.data.id, name })
        .select('id, name')
        .single()
      if (error) throw error
      return data as Account
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.accounts }),
  })
}
