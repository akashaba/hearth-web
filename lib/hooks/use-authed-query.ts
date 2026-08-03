'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, type QueryKey, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'

/**
 * useQuery wrapper that automatically gates on Clerk auth being ready + signed in.
 *
 * On page refresh Clerk needs ~100-500ms to hydrate from the session cookie.
 * If a query fires before then, useSupabase can't attach a JWT, the request goes
 * out with just the anon key, RLS returns empty, and TanStack Query caches that
 * empty result. Auth finishes loading but the query never re-runs because its
 * queryKey hasn't changed. Symptom: dashboard is empty on refresh even though
 * you're signed in and the DB has data.
 *
 * This wrapper adds `enabled: isLoaded && isSignedIn` on top of any `enabled`
 * you pass, so queries wait for auth. Once auth becomes ready, `enabled` flips
 * true and TanStack fires the query.
 */
export function useAuthedQuery<TData, TError = Error>(
  opts: UseQueryOptions<TData, TError, TData, QueryKey>,
): UseQueryResult<TData, TError> {
  const { isLoaded, isSignedIn } = useAuth()
  return useQuery({
    ...opts,
    enabled: (opts.enabled ?? true) && isLoaded && !!isSignedIn,
  })
}
