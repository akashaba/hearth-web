// Supabase Edge Function: generate-weekly-digest
//
// Invoked by pg_cron every Sunday at 08:00 UTC. Iterates every household,
// composes a per-household week-in-review, sends it through Gemini for a
// friendly narrative summary, and stores the markdown on `digest_sends`.
//
// Deploy:
//   supabase functions deploy generate-weekly-digest --no-verify-jwt
//
// Trigger manually to test (before waiting for Sunday):
//   curl -X POST \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
//     -H "Content-Type: application/json" \
//     -d '{"trigger":"manual"}' \
//     https://<PROJECT_REF>.supabase.co/functions/v1/generate-weekly-digest

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { pushToHousehold } from '../_shared/push.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Skip a household if it already got a digest in the last 6 days. Cron may
// misfire, or the function may be manually invoked.
const REQUEUE_MIN_HOURS = 6 * 24

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Only cron + manual admin triggers should hit this — no user auth here.
  // We accept EITHER:
  //   1. The Bearer <SUPABASE_SERVICE_ROLE_KEY> that pg_cron sends (auto-set on Supabase).
  //   2. A custom Bearer <CRON_TRIGGER_KEY> secret you set yourself, useful when
  //      the auto-injected service-role env isn't available (newer sb_secret_
  //      projects), or if you want to rotate the trigger key independently.
  const auth = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronKey = Deno.env.get('CRON_TRIGGER_KEY')
  const accepted = [serviceKey, cronKey]
    .filter((k): k is string => !!k)
    .map((k) => `Bearer ${k}`)
  if (!accepted.includes(auth)) {
    console.error(
      'digest 403 — Authorization did not match. Received prefix:',
      auth.slice(0, 20),
      'Have SUPABASE_SERVICE_ROLE_KEY:',
      !!serviceKey,
      'Have CRON_TRIGGER_KEY:',
      !!cronKey,
    )
    return json({ error: 'forbidden' }, 403)
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return json({ error: 'GEMINI_API_KEY not set' }, 500)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  const { data: households, error: hhErr } = await admin
    .from('households')
    .select('id, name, owner_user_id, timezone')
  if (hhErr) return json({ error: hhErr.message }, 500)

  const results: Array<{ household_id: string; status: 'sent' | 'skipped' | 'failed'; reason?: string }> = []

  for (const h of households ?? []) {
    try {
      const status = await runOne(admin, geminiKey, h.id)
      results.push({ household_id: h.id, status })
    } catch (e) {
      // Isolate failures — one household's error must not block the batch.
      console.error(`digest failed for household ${h.id}:`, e)
      results.push({ household_id: h.id, status: 'failed', reason: (e as Error).message })
    }
  }

  return json({ ran: results.length, results }, 200)
})

async function runOne(
  admin: ReturnType<typeof createClient>,
  geminiKey: string,
  householdId: string,
): Promise<'sent' | 'skipped'> {
  // 1. Debounce — skip if we sent one recently.
  const sixDaysAgo = new Date(Date.now() - REQUEUE_MIN_HOURS * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('digest_sends')
    .select('sent_at', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .gte('sent_at', sixDaysAgo)
  if ((count ?? 0) > 0) return 'skipped'

  // 2. Gather this-week + last-week + upcoming numbers.
  const stats = await collectStats(admin, householdId)
  if (stats.thisWeekIncome === 0 && stats.thisWeekExpenses === 0) {
    // Household with no activity this week — don't bother generating.
    return 'skipped'
  }

  // 3. Ask Gemini to write a short markdown summary.
  const markdown = await composeWithGemini(geminiKey, stats)

  // 4. Persist the digest.
  await admin.from('digest_sends').insert({
    household_id: householdId,
    content: markdown,
  })

  // 5. Push notify every registered device in the household. Errors here should
  // not fail the whole cron run — content is already stored and readable in-app.
  try {
    // Derive a short preview from the markdown for the push body: first non-empty
    // paragraph, stripped of markdown syntax, capped at 140 chars.
    const preview = markdown
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .join(' ')
      .replace(/\*+/g, '')
      .replace(/`+/g, '')
      .slice(0, 140)
    await pushToHousehold(admin, householdId, {
      title: 'Your weekly finance recap',
      body: preview || 'Tap to see the details.',
      data: { route: '/digest' },
    })
  } catch (e) {
    console.warn(`push failed for household ${householdId}:`, (e as Error).message)
  }

  return 'sent'
}

// ─── Stats collection ──────────────────────────────────────────────────────

async function collectStats(admin: ReturnType<typeof createClient>, householdId: string) {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - 7)
  const startOfPrevWeek = new Date(today)
  startOfPrevWeek.setDate(today.getDate() - 14)
  const startOfNextWeek = new Date(today)
  startOfNextWeek.setDate(today.getDate() + 7)

  const iso = (d: Date) => d.toISOString().slice(0, 10)

  // Transactions covering both this and last week.
  const { data: txs } = await admin
    .from('transactions')
    .select('date, amount, type, category:categories(name, group_type)')
    .eq('household_id', householdId)
    .gte('date', iso(startOfPrevWeek))
    .lte('date', iso(today))

  let thisWeekIncome = 0
  let thisWeekExpenses = 0
  let lastWeekExpenses = 0
  const thisWeekByCat = new Map<string, number>()
  const lastWeekByCat = new Map<string, number>()

  for (const t of txs ?? []) {
    const amt = Number((t as { amount: string | number }).amount)
    const isThisWeek = t.date >= iso(startOfWeek)
    if (t.type === 'credit') {
      if (isThisWeek) thisWeekIncome += amt
    } else {
      const catName = (t.category as { name?: string } | null)?.name ?? 'Uncategorized'
      if (isThisWeek) {
        thisWeekExpenses += amt
        thisWeekByCat.set(catName, (thisWeekByCat.get(catName) ?? 0) + amt)
      } else {
        lastWeekExpenses += amt
        lastWeekByCat.set(catName, (lastWeekByCat.get(catName) ?? 0) + amt)
      }
    }
  }

  // Biggest category jump (positive delta this week vs last week).
  let biggestJump: { name: string; delta: number } | null = null
  for (const [name, thisAmt] of thisWeekByCat) {
    const lastAmt = lastWeekByCat.get(name) ?? 0
    const delta = thisAmt - lastAmt
    if (delta > 0 && (!biggestJump || delta > biggestJump.delta)) {
      biggestJump = { name, delta }
    }
  }

  // Upcoming fixed deductions in the next 7 days.
  const { data: deductions } = await admin
    .from('fixed_deductions')
    .select('name, day_of_month, amount, enabled')
    .eq('household_id', householdId)
    .eq('enabled', true)

  const upcoming: Array<{ name: string; amount: number; date: string }> = []
  for (const d of deductions ?? []) {
    const dayOfMonth = (d as { day_of_month: number }).day_of_month
    // Two candidate dates: this month or next month, pick whichever is in the window.
    for (let addMonth = 0; addMonth <= 1; addMonth++) {
      const candidate = new Date(today.getFullYear(), today.getMonth() + addMonth, dayOfMonth)
      if (candidate >= today && candidate <= startOfNextWeek) {
        upcoming.push({
          name: (d as { name: string }).name,
          amount: Number((d as { amount: string | number }).amount),
          date: iso(candidate),
        })
      }
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date))

  // Budget alerts (over 80% used).
  const { data: budgets } = await admin
    .from('budgets')
    .select('monthly_amount, alert_threshold_pct, category:categories(name)')
    .eq('household_id', householdId)
    .eq('active', true)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const { data: monthTxs } = await admin
    .from('transactions')
    .select('amount, category:categories(name)')
    .eq('household_id', householdId)
    .eq('type', 'debit')
    .gte('date', iso(startOfMonth))
  const monthSpendByCat = new Map<string, number>()
  for (const t of monthTxs ?? []) {
    const name = (t.category as { name?: string } | null)?.name ?? 'Uncategorized'
    monthSpendByCat.set(
      name,
      (monthSpendByCat.get(name) ?? 0) + Number((t as { amount: string | number }).amount),
    )
  }
  const overBudget: Array<{ name: string; used: number; cap: number; pct: number }> = []
  for (const b of budgets ?? []) {
    const catName = (b.category as { name?: string } | null)?.name ?? 'Unknown'
    const cap = Number((b as { monthly_amount: string | number }).monthly_amount)
    const used = monthSpendByCat.get(catName) ?? 0
    const pct = cap > 0 ? used / cap : 0
    const threshold = (b as { alert_threshold_pct: number }).alert_threshold_pct / 100
    if (pct >= threshold) overBudget.push({ name: catName, used, cap, pct })
  }

  return {
    weekStart: iso(startOfWeek),
    weekEnd: iso(today),
    thisWeekIncome,
    thisWeekExpenses,
    lastWeekExpenses,
    saved: thisWeekIncome - thisWeekExpenses,
    biggestJump,
    upcoming: upcoming.slice(0, 5),
    overBudget: overBudget.slice(0, 3),
  }
}

// ─── Gemini narrative ──────────────────────────────────────────────────────

async function composeWithGemini(
  apiKey: string,
  stats: Awaited<ReturnType<typeof collectStats>>,
): Promise<string> {
  const prompt = `Write a friendly, concise weekly finance recap in markdown for the user. Use their real numbers. About 5–7 short lines total.

Data (${stats.weekStart} to ${stats.weekEnd}):
- Income this week: $${stats.thisWeekIncome.toFixed(2)}
- Expenses this week: $${stats.thisWeekExpenses.toFixed(2)}
- Expenses last week: $${stats.lastWeekExpenses.toFixed(2)}
- Net saved: $${stats.saved.toFixed(2)}
- Biggest category jump vs last week: ${
    stats.biggestJump ? `${stats.biggestJump.name} +$${stats.biggestJump.delta.toFixed(2)}` : 'none'
  }
- Upcoming bills next 7 days: ${
    stats.upcoming.length === 0
      ? 'none'
      : stats.upcoming.map((u) => `${u.name} ($${u.amount.toFixed(2)}) on ${u.date}`).join('; ')
  }
- Budgets at/over threshold this month: ${
    stats.overBudget.length === 0
      ? 'none'
      : stats.overBudget
          .map((b) => `${b.name} ${(b.pct * 100).toFixed(0)}% ($${b.used.toFixed(2)} of $${b.cap.toFixed(2)})`)
          .join('; ')
  }

Style:
- Start with a one-line headline (bold header) — spend delta or notable event.
- Then a short bullet list of highlights.
- If any bills or overspends are worth flagging, use a "Heads up" callout at the end.
- Keep tone warm, matter-of-fact. No emojis in the headline; sparse elsewhere.
- Never invent numbers.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`gemini ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('gemini returned no text')
  return text.trim()
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
