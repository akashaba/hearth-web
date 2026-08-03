---
name: edge-function
description: Create, secure, and deploy a Supabase Edge Function (Deno) that runs server-side logic for either app. Use when a feature needs code that must not run in the client — a third-party API key, an expensive AI call, cross-user aggregation, or per-user rate limiting. The parse-receipt function is the canonical example.
---

# edge-function

Supabase Edge Functions are Deno TypeScript endpoints deployed alongside the DB. They inherit Clerk-JWT auth: any function invoked with the user's Bearer token sees `auth.jwt()` populated the same way client queries do, so RLS still guards any DB access.

## When to use one

- A third-party API key must be kept off the client (Gemini, Anthropic, OpenAI, Resend, Expo Push, etc.).
- Multi-step server-side logic that would be racy or slow to orchestrate from the client (e.g. upload → OCR → parse → persist).
- Per-household rate limiting or metering (can't be enforced client-side).
- Anything that needs the service-role key (rare — most CRUD should stay client-side via RLS).
- Anything that runs on a schedule via `pg_cron` (weekly digest, recurring-detection sweep) — see `/scheduled-job`.

## File layout

```
supabase/functions/
  <function-name>/
    index.ts               Handler
    deno.jsonc             Import map, tasks
  _shared/
    cors.ts                Standard CORS headers
    supabase.ts            Helpers to build user-scoped + admin Supabase clients
    anthropic.ts           If used by multiple functions
```

## Handler skeleton

```ts
// supabase/functions/parse-receipt/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { userClient, adminClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthorized' }, 401)

  const supabase = userClient(authHeader)   // user-scoped: RLS applies
  const admin = adminClient()               // service-role: bypasses RLS — use sparingly

  const { receipt_id } = await req.json()
  if (!receipt_id) return json({ error: 'receipt_id required' }, 400)

  // 1. Fetch the receipt row via the USER client — RLS ensures the caller's household owns it.
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receipt_id)
    .single()
  if (error || !receipt) return json({ error: 'not found' }, 404)

  // 2. Rate limit — count today's receipts for this household.
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', receipt.household_id)
    .gte('created_at', todayStart.toISOString())
  if ((count ?? 0) > 30) return json({ error: 'daily limit reached' }, 429)

  // 3. Do the work — call Gemini, persist result, return.

  return json({ ok: true }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

## Auth pattern

**User-scoped client** (`_shared/supabase.ts`):

```ts
export function userClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
}
```

**Admin client** (only when RLS must be bypassed):

```ts
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}
```

**Default to `userClient`.** Reach for `adminClient` only when there's a documented reason RLS can't express the operation (e.g. reading a rate-limit counter that spans users).

## Secrets

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set EXPO_ACCESS_TOKEN=...   # for send-push
supabase secrets set RESEND_API_KEY=...      # for email digest (optional)
supabase secrets list
```

Read in handler: `Deno.env.get('GEMINI_API_KEY')`. **Never** commit secrets — `.env` in the function folder is dev-only and gitignored.

## Gemini call pattern

Use the official REST endpoint (avoids a Deno-compat SDK dependency):

```ts
const resp = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemPrompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }, // for vision
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { /* JSON schema */ },
        temperature: 0.1,
      },
    }),
  },
)
const data = await resp.json()
const parsed = JSON.parse(data.candidates[0].content.parts[0].text)
```

For the assistant chat, use `gemini-2.5-pro` with tool-use — see `/ai-tool-use`.

## Local dev

```bash
supabase functions serve <name> --env-file supabase/.env.local
# In another terminal, invoke:
curl -i http://127.0.0.1:54321/functions/v1/<name> \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "receipt_id": "..." }'
```

Get a `CLERK_JWT` by copying one from a signed-in browser session (Application → Cookies → look at the outgoing Supabase request's Authorization header).

## Deploy

**Every function in this project deploys with `--no-verify-jwt`:**

```bash
supabase functions deploy <name> --no-verify-jwt
```

Not because the function is public — it isn't — but because Supabase's edge-function invocation gateway only accepts its own HMAC-signed JWTs. Our clients pass **Clerk RSA256 JWTs** (validated by Supabase's Third-Party Auth for PostgREST, but *not* for Edge Functions). Without the flag, every invocation 401s with `UNAUTHORIZED_ASYMMETRIC_JWT` before the function body runs. See [[edge-functions-need-no-verify-jwt-with-clerk]] in memory.

The function code MUST still do its own auth check — read the `Authorization` header, refuse if missing, and pass it to `createClient` so RLS scopes every DB read/write to the caller's household. The handler skeleton above already does this. Never skip it.

The one exception is a webhook receiver from an external service that verifies via its own signature — flag that in the function's comments.

## Invoking from a client

Web:
```ts
const { data, error } = await supabase.functions.invoke('parse-receipt', {
  body: { receipt_id },
})
```

Mobile: same signature. The Clerk JWT is attached automatically by the fetch interceptor in `useSupabase()`.

## Non-negotiables

- Never log a secret or a raw request body containing user data.
- Never respond with a stack trace to the client — log server-side, return a generic error.
- Every function needs a JSON schema for its input; validate before touching the DB or third-party APIs.
- Every function that spends money must have a rate limit.
- Always use `userClient` unless you have a written reason not to.
