// Supabase Edge Function: parse-receipt
//
// Flow:
//   1. Mobile client uploads compressed JPEG to Storage bucket `receipts/<household_id>/<uuid>.jpg`
//   2. Mobile inserts a `receipts` row with status='pending' referencing the image path
//   3. Mobile POSTs { receipt_id } to this function with the caller's Clerk JWT
//   4. Function reads the row (RLS scopes to household), rate-limits (30/day/household),
//      downloads the image from Storage, sends it inline to Gemini 2.5 Flash with a
//      strict JSON schema, updates `receipts` with the parsed content, and returns
//      the extracted items for the review UI.
//
// Deploy:
//   - Set secret: supabase secrets set GEMINI_API_KEY=... (or via dashboard)
//   - Deploy: supabase functions deploy parse-receipt   (needs Supabase CLI)
//     OR paste this file's contents into Supabase Studio → Edge Functions → Deploy
//
// Invoke from mobile:
//   const { data, error } = await supabase.functions.invoke('parse-receipt', {
//     body: { receipt_id: '...' },
//   })

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CATEGORY_NAMES = [
  'Salary', 'Bonus', 'Interest Income', 'Refund', 'Other Income',
  'Rent / Mortgage', 'Utilities', 'Internet / Phone', 'Health Insurance',
  'Car Insurance', 'Subscriptions', 'Debt Payment', 'Investment', 'Savings Transfer',
  'Groceries', 'Restaurants', 'Coffee', 'Transportation', 'Car Maintenance',
  'Medical', 'Clothing', 'Household', 'Shopping', 'Entertainment', 'Gifts',
  'Donations', 'Travel', 'Education', 'Miscellaneous',
]

const SYSTEM_PROMPT = `You extract structured data from a photograph of a paper retail receipt.

Rules:
- Return one item per purchased line on the receipt. Ignore subtotals, tax lines, totals, tips, and rewards summaries — those go in their own fields.
- Amount is a positive number, no currency symbols.
- Type is always "debit" (receipts are purchases).
- For "category", pick the single best match from this exact list — do NOT invent categories. If nothing fits well, use "Miscellaneous":
${CATEGORY_NAMES.join(', ')}
- Prefer the receipt's own date. If unreadable, leave receipt_date null and the app will default to today.
- Merchant is the store name at the top of the receipt.
- If the image isn't a receipt (blank, blurry, wrong content), return { "items": [] } and null for the other fields.`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    merchant: { type: 'string' },
    receipt_date: { type: 'string' },
    subtotal: { type: 'number' },
    tax: { type: 'number' },
    total: { type: 'number' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string' },
        },
        required: ['description', 'amount', 'category'],
      },
    },
  },
  required: ['items'],
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthenticated' }, 401)

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return json({ error: 'GEMINI_API_KEY not set on the function' }, 500)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!

  // User-scoped client — RLS applies to every read below.
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  let body: { receipt_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body must be JSON with receipt_id' }, 400)
  }
  if (!body.receipt_id) return json({ error: 'receipt_id required' }, 400)

  // 1. Fetch the receipt row (RLS ensures caller's household owns it).
  const { data: receipt, error: receiptErr } = await supabase
    .from('receipts')
    .select('id, household_id, image_path, status, ocr_raw')
    .eq('id', body.receipt_id)
    .single()
  if (receiptErr || !receipt) return json({ error: 'receipt not found' }, 404)

  // Idempotency — if we already parsed, return the cached result.
  if (receipt.status === 'parsed' || receipt.status === 'submitted') {
    return json({ receipt, items: receipt.ocr_raw?.items ?? [] }, 200)
  }

  // 2. Rate limit — 30 receipts / day / household.
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', receipt.household_id)
    .gte('created_at', todayStart.toISOString())
  if ((count ?? 0) > 30) {
    await markFailed(supabase, receipt.id, 'daily limit reached (30 receipts / day / household)')
    return json({ error: 'daily limit reached' }, 429)
  }

  // 3. Download the image from Storage (respects bucket RLS via the JWT).
  const { data: blob, error: dlError } = await supabase.storage
    .from('receipts')
    .download(receipt.image_path)
  if (dlError || !blob) {
    await markFailed(supabase, receipt.id, dlError?.message ?? 'image download failed')
    return json({ error: dlError?.message ?? 'image download failed' }, 500)
  }

  const arrayBuffer = await blob.arrayBuffer()
  // Convert to base64 in chunks to avoid stack overflow on large images.
  const base64 = arrayBufferToBase64(arrayBuffer)
  const mime = blob.type || 'image/jpeg'

  // 4. Call Gemini with the image + system prompt.
  //    `gemini-flash-latest` is an alias that auto-tracks the current stable Flash
  //    release. The pinned `gemini-2.5-flash` name is being retired for new API keys.
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`
  let geminiRes: Response
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Extract every purchased item.' },
              { inlineData: { mimeType: mime, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      }),
    })
  } catch (e) {
    await markFailed(supabase, receipt.id, 'gemini unreachable: ' + (e as Error).message)
    return json({ error: 'gemini unreachable' }, 502)
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    await markFailed(supabase, receipt.id, `gemini ${geminiRes.status}: ${errText.slice(0, 200)}`)
    return json({ error: `gemini ${geminiRes.status}` }, 502)
  }

  const gemJson = (await geminiRes.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = gemJson.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    await markFailed(supabase, receipt.id, 'gemini returned no text')
    return json({ error: 'gemini returned no text' }, 502)
  }

  let parsed: {
    merchant?: string
    receipt_date?: string
    subtotal?: number
    tax?: number
    total?: number
    items: Array<{ description: string; amount: number; category: string }>
  }
  try {
    parsed = JSON.parse(text)
  } catch {
    await markFailed(supabase, receipt.id, 'gemini returned non-JSON')
    return json({ error: 'gemini returned non-JSON' }, 502)
  }

  // 5. Persist the parse result on the receipts row so the mobile app has a
  //    single source of truth for the review screen.
  const receiptDate = normalizeDate(parsed.receipt_date)
  await supabase
    .from('receipts')
    .update({
      status: 'parsed',
      merchant: parsed.merchant ?? null,
      receipt_date: receiptDate,
      subtotal: parsed.subtotal ?? null,
      tax: parsed.tax ?? null,
      total: parsed.total ?? null,
      ocr_raw: parsed,
      error: null,
    })
    .eq('id', receipt.id)

  return json(
    {
      receipt: {
        id: receipt.id,
        merchant: parsed.merchant ?? null,
        receipt_date: receiptDate,
        subtotal: parsed.subtotal ?? null,
        tax: parsed.tax ?? null,
        total: parsed.total ?? null,
      },
      items: parsed.items ?? [],
    },
    200,
  )
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function markFailed(supabase: ReturnType<typeof createClient>, id: string, error: string) {
  await supabase.from('receipts').update({ status: 'failed', error }).eq('id', id)
}

function normalizeDate(input?: string): string | null {
  if (!input) return null
  // Accept YYYY-MM-DD only; drop anything else so the DB `date` column doesn't error.
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : null
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
