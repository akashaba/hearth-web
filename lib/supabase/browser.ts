'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@clerk/nextjs'

// A ref that lives OUTSIDE any component, updated by useSupabase() on every render.
// The fetch wrapper reads it lazily, so it always sees the current Clerk state
// instead of a stale closure from whatever render created the Supabase client.
const getTokenRef: { current: (() => Promise<string | null>) | null } = { current: null }

// Client is intentionally untyped (no <Database> generic) because types.gen.ts
// is a stub until you run `supabase gen types typescript --project-id <id>`.
// Runtime is unchanged; you lose column-level autocompletion.
let clientSingleton: ReturnType<typeof createBrowserClient> | null = null

function getSharedClient() {
  if (clientSingleton) return clientSingleton
  clientSingleton = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (
          url: string | URL | Request,
          options: RequestInit = {},
        ): Promise<Response> => {
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
