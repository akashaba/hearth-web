'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'

export type RecurringSuggestion = {
  id: string
  merchant: string
  avg_amount: number
  avg_day_of_month: number
  suggested_category_id: string | null
  suggested_category: { id: string; name: string } | null
  occurrence_count: number
  first_seen: string
  last_seen: string
  status: 'pending' | 'accepted' | 'dismissed'
}

export function usePendingRecurringSuggestions(): {
  data: RecurringSuggestion[]
  isLoading: boolean
} {
  const supabase = useSupabase()
  const q = useAuthedQuery<RecurringSuggestion[]>({
    queryKey: qk.recurringSuggestions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_suggestions')
        .select(
          'id, merchant, avg_amount, avg_day_of_month, suggested_category_id, occurrence_count, first_seen, last_seen, status, suggested_category:categories!suggested_category_id(id, name)',
        )
        .eq('status', 'pending')
        .order('last_seen', { ascending: false })
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...(r as unknown as RecurringSuggestion),
        avg_amount: Number((r as unknown as { avg_amount: string | number }).avg_amount),
      })) as RecurringSuggestion[]
    },
  })
  return { data: q.data ?? [], isLoading: q.isLoading }
}

export function useUpdateSuggestionStatus() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'dismissed' }) => {
      const { error } = await supabase.from('recurring_suggestions').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recurringSuggestions }),
  })
}
