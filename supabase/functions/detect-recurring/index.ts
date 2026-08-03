// Supabase Edge Function: detect-recurring
//
// Invoked by pg_cron once a week. Sweeps every household's recent debits,
// groups by normalized merchant + amount bucket, finds sequences with
// monthly/biweekly/weekly cadence, and upserts them into
// public.recurring_suggestions (status='pending'). Skips anything already
// present as a fixed_deduction or an accepted/dismissed suggestion.
//
// Deploy:
//   supabase functions deploy detect-recurring --no-verify-jwt
//
// Trigger manually to test:
//   curl -X POST \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
//     -H "Content-Type: application/json" \
//     -d '{"trigger":"manual"}' \
//     https://<PROJECT_REF>.supabase.co/functions/v1/detect-recurring

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Look-back window. Enough for ~6 monthly occurrences, ~13 biweekly, ~26 weekly.
const LOOKBACK_DAYS = 180
const MIN_OCCURRENCES = 3
const AMOUNT_TOLERANCE = 0.1 // ±10% of median

// Cadence windows (median gap in days must fall inside one of these).
const CADENCES: Array<{ name: 'weekly' | 'biweekly' | 'monthly'; min: number; max: number }> = [
  { name: 'weekly', min: 6, max: 8 },
  { name: 'biweekly', min: 12, max: 16 },
  { name: 'monthly', min: 25, max: 35 },
]

type Tx = {
  id: string
  date: string
  description: string
  amount: number
  category_id: string | null
}

type SuggestionRow = {
  household_id: string
  merchant: string
  avg_amount: number
  avg_day_of_month: number
  suggested_category_id: string | null
  occurrence_count: number
  first_seen: string
  last_seen: string
  status: 'pending'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Same dual-auth pattern as generate-weekly-digest.
  const auth = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronKey = Deno.env.get('CRON_TRIGGER_KEY')
  const accepted = [serviceKey, cronKey]
    .filter((k): k is string => !!k)
    .map((k) => `Bearer ${k}`)
  if (!accepted.includes(auth)) {
    console.error(
      'detect-recurring 403 — Authorization did not match. Have SERVICE_ROLE:',
      !!serviceKey,
      'Have CRON_TRIGGER_KEY:',
      !!cronKey,
    )
    return json({ error: 'forbidden' }, 403)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey ?? '', {
    auth: { persistSession: false },
  })

  const { data: households, error: hhErr } = await admin
    .from('households')
    .select('id')
  if (hhErr) return json({ error: hhErr.message }, 500)

  const results: Array<{ household_id: string; inserted: number; skipped_reason?: string }> = []
  for (const h of households ?? []) {
    try {
      const inserted = await runOne(admin, h.id as string)
      results.push({ household_id: h.id as string, inserted })
    } catch (e) {
      console.error(`detect-recurring failed for household ${h.id}:`, e)
      results.push({ household_id: h.id as string, inserted: 0, skipped_reason: (e as Error).message })
    }
  }
  return json({ ran: results.length, results }, 200)
})

async function runOne(
  admin: ReturnType<typeof createClient>,
  householdId: string,
): Promise<number> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString().slice(0, 10)

  const { data: txs, error: txErr } = await admin
    .from('transactions')
    .select('id, date, description, amount, category_id')
    .eq('household_id', householdId)
    .eq('type', 'debit')
    .gte('date', since)
    .order('date', { ascending: true })
  if (txErr) throw txErr
  if (!txs || txs.length < MIN_OCCURRENCES) return 0

  // Existing fixed deductions — don't re-suggest what the user already keyed in.
  const { data: existingDeductions } = await admin
    .from('fixed_deductions')
    .select('name, amount')
    .eq('household_id', householdId)
  const knownDeductionKeys = new Set(
    (existingDeductions ?? []).map((d) => keyForNameAmount(String(d.name), Number(d.amount))),
  )

  // Existing suggestions the user already dismissed — don't nag with the same one.
  const { data: existingSuggestions } = await admin
    .from('recurring_suggestions')
    .select('merchant, avg_amount, status')
    .eq('household_id', householdId)
    .in('status', ['dismissed', 'accepted'])
  const suppressedKeys = new Set(
    (existingSuggestions ?? []).map((s) =>
      keyForNameAmount(String(s.merchant), Number(s.avg_amount)),
    ),
  )

  // Group by normalized merchant.
  const byMerchant = new Map<string, Tx[]>()
  for (const raw of txs) {
    const t: Tx = {
      id: raw.id as string,
      date: raw.date as string,
      description: (raw.description as string) ?? '',
      amount: Number(raw.amount),
      category_id: (raw.category_id as string | null) ?? null,
    }
    const norm = normalizeMerchant(t.description)
    if (!norm) continue
    const bucket = byMerchant.get(norm) ?? []
    bucket.push(t)
    byMerchant.set(norm, bucket)
  }

  const rows: SuggestionRow[] = []
  for (const [merchant, entries] of byMerchant) {
    if (entries.length < MIN_OCCURRENCES) continue

    // Sub-cluster by amount to handle merchants whose charges vary widely
    // (e.g. groceries at the same store aren't recurring; Netflix is).
    const clusters = clusterByAmount(entries)
    for (const cluster of clusters) {
      if (cluster.length < MIN_OCCURRENCES) continue
      const dates = cluster.map((t) => new Date(t.date + 'T00:00:00'))
      dates.sort((a, b) => a.getTime() - b.getTime())
      const gaps: number[] = []
      for (let i = 1; i < dates.length; i++) {
        gaps.push(Math.round((dates[i].getTime() - dates[i - 1].getTime()) / 86400_000))
      }
      const gapMedian = median(gaps)
      const cadence = CADENCES.find((c) => gapMedian >= c.min && gapMedian <= c.max)
      if (!cadence) continue

      const amt = median(cluster.map((t) => t.amount))
      const merchantLabel = mostCommonDescription(cluster)
      const key = keyForNameAmount(merchantLabel, amt)
      if (knownDeductionKeys.has(key) || suppressedKeys.has(key)) continue

      const first = dates[0].toISOString().slice(0, 10)
      const last = dates[dates.length - 1].toISOString().slice(0, 10)
      const suggestedCategory = mostCommonCategory(cluster)
      const avgDay = Math.round(median(dates.map((d) => d.getDate())))

      rows.push({
        household_id: householdId,
        merchant: merchantLabel,
        avg_amount: round2(amt),
        avg_day_of_month: Math.min(31, Math.max(1, avgDay)),
        suggested_category_id: suggestedCategory,
        occurrence_count: cluster.length,
        first_seen: first,
        last_seen: last,
        status: 'pending',
      })
    }
  }

  if (rows.length === 0) return 0

  // Upsert on (household_id, merchant, avg_amount) — the table's unique
  // constraint. Refreshes counts/dates for still-active recurrings, adds
  // brand-new ones. Won't touch previously accepted/dismissed (filtered out
  // above); a suggestion still in 'pending' will just be refreshed.
  const { error: insErr } = await admin
    .from('recurring_suggestions')
    .upsert(rows, { onConflict: 'household_id,merchant,avg_amount', ignoreDuplicates: false })
  if (insErr) throw insErr
  return rows.length
}

// ---- helpers ----

function normalizeMerchant(desc: string): string {
  // Uppercase, drop trailing reference numbers, collapse whitespace, strip
  // punctuation that varies from statement to statement. Leaves enough
  // signal ("NETFLIX", "SPOTIFY") to group repeat charges.
  return desc
    .toUpperCase()
    .replace(/#\d+/g, '')
    .replace(/\b\d{6,}\b/g, '')
    .replace(/[^A-Z0-9 &]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

function clusterByAmount(entries: Tx[]): Tx[][] {
  if (entries.length === 0) return []
  const sorted = [...entries].sort((a, b) => a.amount - b.amount)
  const clusters: Tx[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]
    const last = clusters[clusters.length - 1]
    const pivot = median(last.map((t) => t.amount))
    // Grow the current cluster while the new amount stays within tolerance of
    // its median; otherwise start a new cluster.
    if (Math.abs(cur.amount - pivot) / Math.max(1, pivot) <= AMOUNT_TOLERANCE) {
      last.push(cur)
    } else {
      clusters.push([cur])
    }
  }
  return clusters
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mostCommonDescription(cluster: Tx[]): string {
  const counts = new Map<string, number>()
  for (const t of cluster) {
    const key = t.description.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let bestKey = cluster[0].description.trim() || 'Recurring charge'
  let bestCount = -1
  for (const [k, c] of counts) {
    if (c > bestCount) {
      bestKey = k
      bestCount = c
    }
  }
  return bestKey.slice(0, 80)
}

function mostCommonCategory(cluster: Tx[]): string | null {
  const counts = new Map<string, number>()
  for (const t of cluster) {
    if (!t.category_id) continue
    counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k
      bestCount = c
    }
  }
  return best
}

function keyForNameAmount(name: string, amount: number): string {
  return `${normalizeMerchant(name)}::${round2(amount).toFixed(2)}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
