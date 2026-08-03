'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@clerk/nextjs'
import type { Database } from '@/shared/types.gen'

// A ref that lives OUTSIDE any component, updated by useSupabase() on every render.
// The fetch wrapper reads it lazily, so it always sees the current Clerk state
// instead of a stale closure from whatever render created the Supabase client.
const getTokenRef: { current: (() => Promise<string | null>) | null } = { current: null }

let clientSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null

function getSharedClient() {
  if (clientSingleton) return clientSingleton
  clientSingleton = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          let token: string | null = null
          try {
            token = getTokenRef.current ? await getTokenRef.current() : null
          } catch {
            token = null
          }
          const headers = new Headers(options.headers)
          if (token) headers.set('Authorization', `Bearer ${token}`)
          return fetch(url, { ...options, headers })
        },
      },
    },
  )
  return clientSingleton
}

export function useSupabase() {
  const { getToken } = useAuth()
  // Update the ref every render so the shared fetch always reads the latest
  // getToken. Cheap; runs during render but doesn't cause a re-render.
  getTokenRef.current = async () => {
    try {
      return await getToken()
    } catch {
      return null
    }
  }
  return getSharedClient()
}
