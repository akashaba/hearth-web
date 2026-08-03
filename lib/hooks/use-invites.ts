'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { useAuthedQuery } from './use-authed-query'

export type PendingInvite = {
  code: string
  household_id: string
  expires_at: string
  created_at: string
}

export function usePendingInvites(householdId: string | null | undefined) {
  const supabase = useSupabase()
  return useAuthedQuery<PendingInvite[]>({
    queryKey: ['pending-invites', householdId ?? '__none__'],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_invites')
        .select('code, household_id, expires_at, created_at')
        .eq('household_id', householdId)
        .is('consumed_by_user_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PendingInvite[]
    },
    enabled: !!householdId,
  })
}

export function useGenerateInvite() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (householdId: string) => {
      const { data, error } = await supabase.rpc('generate_invite_code', { hid: householdId })
      if (error) throw error
      return data as string
    },
    onSuccess: (_c, householdId) => {
      qc.invalidateQueries({ queryKey: ['pending-invites', householdId] })
    },
  })
}

export function useAcceptInvite() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('accept_invite_code', { code_input: code })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return row as { id: string; name: string; owner_user_id: string }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household'] })
      qc.invalidateQueries({ queryKey: ['household-members'] })
      qc.invalidateQueries({ queryKey: ['pending-invites'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['monthly-summary'] })
      qc.invalidateQueries({ queryKey: ['category-breakdown'] })
      qc.invalidateQueries({ queryKey: ['setup'] })
      qc.invalidateQueries({ queryKey: ['fixed-deductions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
