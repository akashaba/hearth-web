'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'

export type Household = {
  id: string
  name: string
  owner_user_id: string
  timezone: string
}

export function useCurrentHousehold() {
  const supabase = useSupabase()
  const { isSignedIn, isLoaded } = useAuth()
  return useQuery<Household>({
    queryKey: qk.household,
    // bootstrap_household() is idempotent: creates the household + Checking account
    // on first call for a user, returns their existing household on every call after.
    // Calling it here means the client is never blocked waiting on the server-side
    // bootstrap in (app)/layout.tsx to have run first.
    queryFn: async () => {
      const { data, error } = await supabase.rpc('bootstrap_household')
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('bootstrap_household returned no row')
      return row as Household
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 5 * 60 * 1000,
  })
}
