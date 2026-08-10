// Supabase Edge Function: daily-sweep
//
// Runs every morning via pg_cron. Per household:
//   1. Auto-create transactions for every fixed_deduction whose
//      day_of_month == today (idempotent — the unique index on
//      (source_deduction_id, month) blocks duplicates). The transaction
//      insert trigger creates an `auto_deduction` notification with the
//      before/after balance baked in.
//   2. Create `upcoming_deduction` notifications 1 day before each fixed
//      deduction is due (idempotent via a same-day dedupe).
//   3. Snapshot today's budget statuses; compare to yesterday's cached
//      snapshot; emit budget_warning / budget_over notifications on
//      transitions ONLY (not every day the budget is over).
//
// Deploy:
//   supabase functions deploy daily-sweep --no-verify-jwt

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Same dual-auth pattern as the other cron functions.
  const auth = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronKey = Deno.env.get('CRON_TRIGGER_KEY')
  const accepted = [serviceKey, cronKey]
    .filter((k): k is string => !!k)
    .map((k) => `Bearer ${k}`)
  if (!accepted.includes(auth)) {
    return json({ error: 'forbidden' }, 403)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey ?? '', {
    auth: { persistSession: false },
  })

  const today = new Date()
  const todayIso = toISO(today)
  const tomorrow = new Date(today.getTime() + 86400_000)
  const tomorrowDayOfMonth = tomorrow.getDate()
  const todayDayOfMonth = today.getDate()

  const { data: households, error: hhErr } = await admin
    .from('households')
    .select('id')
  if (hhErr) return json({ error: hhErr.message }, 500)

  const results: Array<{
    household_id: string
    auto_added: number
    upcoming: number
    budget_alerts: number
    error?: string
  }> = []

  for (const h of households ?? []) {
    try {
      const r = await runOne(admin, h.id as string, todayIso, todayDayOfMonth, tomorrowDayOfMonth)
      results.push({ household_id: h.id as string, ...r })
    } catch (e) {
      console.error(`daily-sweep failed for ${h.id}:`, e)
      results.push({
        household_id: h.id as string,
        auto_added: 0,
        upcoming: 0,
        budget_alerts: 0,
        error: (e as Error).message,
      })
    }
  }
  return json({ ran: results.length, results }, 200)
})

async function runOne(
  admin: ReturnType<typeof createClient>,
  householdId: string,
  todayIso: string,
  todayDayOfMonth: number,
  tomorrowDayOfMonth: number,
): Promise<{ auto_added: number; upcoming: number; budget_alerts: number }> {
  let autoAdded = 0
  let upcoming = 0
  let budgetAlerts = 0

  // Fetch this household's enabled fixed deductions once.
  const { data: deductions } = await admin
    .from('fixed_deductions')
    .select('id, name, day_of_month, amount, category_id')
    .eq('household_id', householdId)
    .eq('enabled', true)

  // Default account (bootstrap creates a 'Checking' — use whatever's first).
  const { data: accountRow } = await admin
    .from('accounts')
    .select('id')
    .eq('household_id', householdId)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  const accountId = (accountRow as { id?: string } | null)?.id

  // ─── 1. Auto-add today's fixed deductions ─────────────────────────
  for (const d of (deductions ?? []) as Array<{
    id: string
    name: string
    day_of_month: number
    amount: number
    category_id: string
  }>) {
    if (d.day_of_month !== todayDayOfMonth) continue
    if (!accountId) continue
    // The unique index blocks duplicates; we still catch and continue on error.
    const { error: insErr } = await admin.from('transactions').insert({
      household_id: householdId,
      account_id: accountId,
      category_id: d.category_id,
      date: todayIso,
      description: d.name,
      amount: d.amount,
      type: 'debit',
      source_deduction_id: d.id,
    })
    if (!insErr) autoAdded++
    // "duplicate key" errors are expected on second-run same day — swallow.
  }

  // ─── 2. Upcoming (tomorrow's) fixed deductions ────────────────────
  const upcomingDeductions = (deductions ?? []).filter(
    (d) => (d as { day_of_month: number }).day_of_month === tomorrowDayOfMonth,
  ) as Array<{ id: string; name: string; amount: number }>

  for (const d of upcomingDeductions) {
    // Idempotency: skip if we already made an "upcoming_deduction" notification
    // for THIS deduction TODAY.
    const startOfDay = todayIso + 'T00:00:00Z'
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('kind', 'upcoming_deduction')
      .gte('created_at', startOfDay)
      .contains('meta', { deduction_id: d.id })
    if ((count ?? 0) > 0) continue

    const { error: nErr } = await admin.from('notifications').insert({
      household_id: householdId,
      kind: 'upcoming_deduction',
      title: `Upcoming: ${d.name} tomorrow`,
      body: `${d.name} of $${d.amount.toFixed(2)} is due tomorrow.`,
      meta: { deduction_id: d.id, amount: d.amount },
      related_href: '/setup',
    })
    if (!nErr) upcoming++
  }

  // ─── 3. Budget crossings ──────────────────────────────────────────
  // Compute each budget's current-month spend + status. Compare to what
  // we cached in a `budget_snapshots` row from yesterday. Only notify on
  // status transitions (ok → warning, warning → over, ok → over).
  const now = new Date()
  const startOfMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`

  const { data: budgets } = await admin
    .from('budgets')
    .select('id, category_id, monthly_amount, alert_threshold_pct, category:categories(name)')
    .eq('household_id', householdId)
    .eq('active', true)

  for (const b of (budgets ?? []) as Array<{
    id: string
    category_id: string
    monthly_amount: number
    alert_threshold_pct: number
    category: { name: string } | null
  }>) {
    // This-month spend for the budgeted category.
    const { data: txs } = await admin
      .from('transactions')
      .select('amount')
      .eq('household_id', householdId)
      .eq('category_id', b.category_id)
      .eq('type', 'debit')
      .gte('date', startOfMonth)

    const spent = (txs ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0)
    const pct = b.monthly_amount > 0 ? (spent / b.monthly_amount) * 100 : 0
    const currentStatus: 'ok' | 'warning' | 'over' =
      pct >= 100 ? 'over' : pct >= b.alert_threshold_pct ? 'warning' : 'ok'

    // Look up the last notification we sent for this budget this month.
    const { data: lastAlert } = await admin
      .from('notifications')
      .select('kind, created_at')
      .eq('household_id', householdId)
      .in('kind', ['budget_warning', 'budget_over'])
      .contains('meta', { budget_id: b.id })
      .gte('created_at', startOfMonth)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastKind = (lastAlert as { kind?: string } | null)?.kind ?? null
    // Emit a warning if we're in warning AND haven't emitted anything this month.
    // Emit an over-cap alert if we crossed 100 AND haven't already sent 'over'.
    if (currentStatus === 'warning' && lastKind !== 'budget_warning' && lastKind !== 'budget_over') {
      await admin.from('notifications').insert({
        household_id: householdId,
        kind: 'budget_warning',
        title: `${b.category?.name ?? 'Category'} budget at ${Math.round(pct)}%`,
        body: `You've spent $${spent.toFixed(2)} of your $${b.monthly_amount.toFixed(2)} monthly cap for ${b.category?.name ?? 'this category'}.`,
        meta: { budget_id: b.id, category_id: b.category_id, spent, monthly_amount: b.monthly_amount, pct },
        related_href: '/budgets',
      })
      budgetAlerts++
    } else if (currentStatus === 'over' && lastKind !== 'budget_over') {
      await admin.from('notifications').insert({
        household_id: householdId,
        kind: 'budget_over',
        title: `${b.category?.name ?? 'Category'} budget over cap`,
        body: `You've spent $${spent.toFixed(2)} — that's $${(spent - b.monthly_amount).toFixed(2)} over your $${b.monthly_amount.toFixed(2)} cap this month.`,
        meta: { budget_id: b.id, category_id: b.category_id, spent, monthly_amount: b.monthly_amount, pct },
        related_href: '/budgets',
      })
      budgetAlerts++
    }
  }

  return { auto_added: autoAdded, upcoming, budget_alerts: budgetAlerts }
}

function toISO(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
