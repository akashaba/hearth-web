'use client'

import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import type { CategoryGroup, TransactionType } from '@/shared/categories'

export type Category = {
  id: string
  name: string
  group_type: CategoryGroup
  default_type: TransactionType
  notes: string | null
  sort_order: number
}

export function useCategories() {
  const supabase = useSupabase()
  return useAuthedQuery<Category[]>({
    queryKey: qk.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, group_type, default_type, notes, sort_order')
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Category[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
