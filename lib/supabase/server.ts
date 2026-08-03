import { createServerClient } from '@supabase/ssr'
import { auth } from '@clerk/nextjs/server'
import type { Database } from '@/shared/types.gen'

export async function createSupabaseServer() {
  const { getToken } = await auth()
  // No template arg — Supabase Third-Party Auth validates Clerk's standard
  // session JWT via JWKS. The template-based flow is the older API.
  const token = await getToken()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  )
}
