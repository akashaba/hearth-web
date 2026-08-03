'use client'

import { useSupabase } from '@/lib/supabase/browser'
import { useAuthedQuery } from './use-authed-query'

export type HouseholdMember = {
  household_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export function useHouseholdMembers(householdId: string | null | undefined) {
  const supabase = useSupabase()
  return useAuthedQuery<HouseholdMember[]>({
    queryKey: ['household-members', householdId ?? '__none__'],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, user_id, role, joined_at')
        .eq('household_id', householdId)
        .order('joined_at')
      if (error) throw error
      return (data ?? []) as HouseholdMember[]
    },
    enabled: !!householdId,
  })
}
