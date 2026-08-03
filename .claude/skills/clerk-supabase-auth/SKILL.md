---
name: clerk-supabase-auth
description: Wire Clerk-issued JWTs into a Supabase client on the Next.js web app. Use whenever auth is being set up or debugged — including the "queries return empty arrays" symptom that means the token isn't reaching Supabase.
---

# clerk-supabase-auth (web)

Clerk owns identity; Supabase owns data. Every Supabase request must carry a Clerk-signed JWT so RLS policies (`auth.jwt() ->> 'sub' = user_id`) can gate rows to the right user.

## One-time Clerk + Supabase setup (do this once for both repos)

In the Clerk dashboard:

1. **JWT Templates → New template → Supabase**. Names the template `supabase` with correct claims (`sub`, `email`, `role: authenticated`).
2. Copy the Clerk **JWKS URL** from the Clerk API keys page.

In the Supabase dashboard:

3. **Authentication → Providers → Third-party Auth**, add Clerk. Paste the JWKS URL. Save.

Now Supabase accepts JWTs signed by Clerk and populates `auth.jwt()` from them.

## Env vars

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
# Server-only Supabase key for admin ops (bulk import, etc):
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose the service-role key to the browser (no `NEXT_PUBLIC_` prefix).

## Browser client (`lib/supabase/browser.ts`)

```ts
import { createBrowserClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import { useMemo } from 'react'

export function useSupabaseBrowser() {
  const { session } = useSession()
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await session?.getToken({ template: 'supabase' })
          const headers = new Headers(options.headers)
          if (token) headers.set('Authorization', `Bearer ${token}`)
          return fetch(url, { ...options, headers })
        },
      },
    },
  ), [session])
}
```

## Server client (`lib/supabase/server.ts`)

```ts
import { createServerClient } from '@supabase/ssr'
import { auth } from '@clerk/nextjs/server'

export async function createSupabaseServer() {
  const { getToken } = auth()
  const token = await getToken({ template: 'supabase' })
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      cookies: { get() { return undefined } },
    },
  )
}
```

Call this per request in Server Components and route handlers. **Do not cache a single client across users.**

## Middleware (`middleware.ts`)

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtected = createRouteMatcher(['/((?!sign-in|sign-up|_next).*)'])

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect()
})
```

## Debugging "queries return empty arrays"

If a query that should return rows returns `[]`:

1. In devtools Network panel, inspect the outgoing `Authorization` header on the Supabase request. Missing or literal `Bearer null` → the token fetch failed. Check that the JWT template is named exactly `supabase`.
2. In Supabase SQL editor: `select auth.jwt();` while running the same request via a proxy — should show your Clerk claims. `null` → the JWKS integration isn't configured.
3. Confirm the row's `household_id` matches a `household_members` row where `user_id = <caller's Clerk sub>`. All data tables are household-scoped, not user-scoped. `household_members.user_id` stores the Clerk `sub`, not the Clerk `id` — they differ.
4. Confirm RLS is enabled and policies exist for `select`. A table with RLS on and no policy returns zero rows.
5. On first sign-in, the caller must have a `households` row + a `household_members` row auto-created. If missing, the sign-in hook / on-first-query bootstrap didn't fire — check it.

## Never

- Ship the service-role key to the client.
- Put credentials in git.
- Query Supabase without the Clerk-injecting client (imports of `createClient` outside `lib/supabase/*` are a code smell).
