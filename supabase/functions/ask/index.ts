// Supabase Edge Function: ask
//
// Personal-finance assistant. Runs Gemini 2.5 with tool-use over a read-only
// view of the caller's data (transactions, budgets, goals, deductions).
//
// Flow:
//   1. Mobile/web posts { conversation_id, message } with the Clerk JWT.
//   2. We persist the user's message.
//   3. Enter a tool-use loop (max 8 turns): send convo + tools to Gemini; if
//      it emits a functionCall, execute it via the caller's user-scoped
//      Supabase client (RLS gates the data), return the result, repeat.
//   4. On text response, persist the assistant message and return.
//
// Deploy:
//   supabase functions deploy ask --no-verify-jwt
//   (--no-verify-jwt is required because clients pass Clerk JWTs, not
//    Supabase-signed ones — see memory: edge-functions-need-no-verify-jwt-with-clerk)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_TURNS = 8
const DAILY_LIMIT = 30

const SYSTEM_PROMPT = `You are a personal finance assistant with read-only access to the user's
own data via the provided tools. Answer their questions concisely.

Rules:
- Prefer dollar amounts over percentages unless they ask for percentages.
- When they ask "should I", offer 1–2 concrete options with real numbers pulled via tools — never generic advice.
- If a question cannot be answered from the available data, say so plainly and suggest what to track.
- Never invent numbers. If you didn't get it from a tool, don't state it.
- Today's date is available at the top of the conversation history for temporal context.

Investment-readiness questions (should I invest, Roth IRA, index funds, etc.):
- Open with: "Not licensed financial advice — just educational context based on your numbers."
- Call \`investment_readiness\` first to get emergency-fund coverage, savings rate, and debt situation.
- Walk through the standard readiness ladder in order, using the user's real numbers at each rung:
  1. 3–6 months of essential expenses in an emergency fund
  2. Any employer 401(k) match — capture the full match (free money)
  3. Pay off high-APR debt (roughly >7% APR) before adding taxable investing
  4. Max tax-advantaged accounts (Roth IRA, then HSA if eligible, then 401(k) beyond the match)
  5. Taxable brokerage for anything beyond that
- Point to which rung the user's numbers put them on and what a reasonable *next* dollar might do — but never recommend specific tickers, allocations, or products. Say "a broad-market index fund" not "VTI".
- If asked "how much should I put in X", give the framework (e.g. Roth IRA contribution limit) and let them decide, don't prescribe.`

const TOOLS = [
  {
    name: 'query_transactions',
    description:
      "Fetch transactions for the caller's household with optional filters. Returns date, description, amount, type (debit=money out, credit=money in), category name+group, account name.",
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'YYYY-MM-DD inclusive lower bound' },
        end_date: { type: 'string', description: 'YYYY-MM-DD inclusive upper bound' },
        category_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter to these category names exactly (e.g. ["Coffee", "Restaurants"])',
        },
        type: { type: 'string', enum: ['debit', 'credit'] },
        limit: { type: 'integer', description: 'Max rows to return (default 100, max 500)' },
      },
    },
  },
  {
    name: 'monthly_summary',
    description:
      'The 12-row year summary for a given year — income, fixed, variable, saved per month.',
    parameters: {
      type: 'object',
      properties: { year: { type: 'integer' } },
      required: ['year'],
    },
  },
  {
    name: 'category_breakdown',
    description: 'Per-category totals + counts for a specific month.',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'integer' },
        month: { type: 'integer', description: '1-12' },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'list_budgets',
    description: "All active budgets for the household with current-month spend + remaining.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_savings_goals',
    description: 'All savings goals with current progress + pace needed.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_fixed_deductions',
    description: 'Enabled recurring bills from Setup.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'current_balance',
    description:
      "The household's current balance today: starting_balance + all credits − all debits since starting-balance date.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'investment_readiness',
    description:
      "Snapshot for investment-readiness discussions ONLY — call this when the user asks about investing, Roth IRA, 401k, index funds, or 'should I start investing'. Returns emergency-fund coverage (months of essential spend the current balance covers), 3-month savings rate, total high-APR debt, and monthly debt payments. Do NOT recommend specific products, tickers, or allocations from this data.",
    parameters: { type: 'object', properties: {} },
  },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthenticated' }, 401)

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return json({ error: 'GEMINI_API_KEY not set' }, 500)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  let body: { conversation_id?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body must be JSON' }, 400)
  }
  const message = body.message?.trim()
  if (!message) return json({ error: 'message required' }, 400)

  // Look up the caller's household. bootstrap_household() is idempotent + SECURITY DEFINER.
  const { data: hh } = await supabase.rpc('bootstrap_household')
  const householdRow = Array.isArray(hh) ? hh[0] : hh
  if (!householdRow?.id) return json({ error: 'no household' }, 500)
  const householdId = householdRow.id as string

  // Rate limit — count today's user-role messages for this household.
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('assistant_messages')
    .select('id, conversation:assistant_conversations!inner(household_id)', {
      count: 'exact',
      head: true,
    })
    .eq('conversation.household_id', householdId)
    .eq('role', 'user')
    .gte('created_at', todayStart.toISOString())
  if ((count ?? 0) > DAILY_LIMIT) {
    return json({ error: 'daily limit reached' }, 429)
  }

  // Get or create conversation.
  let conversationId = body.conversation_id
  if (!conversationId) {
    const { data: convo, error: cErr } = await supabase
      .from('assistant_conversations')
      .insert({ household_id: householdId, title: message.slice(0, 60) })
      .select('id')
      .single()
    if (cErr || !convo) return json({ error: 'could not create conversation: ' + (cErr?.message ?? '') }, 500)
    conversationId = convo.id as string
  }

  // Persist the user message.
  await supabase.from('assistant_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: { text: message },
  })

  // Load conversation history (chronological).
  const { data: history } = await supabase
    .from('assistant_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at')

  // Build Gemini `contents` from history.
  // Gemini uses only 'user' | 'model' roles — function responses go inside
  // 'user' with a `functionResponse` part. There's no 'function' role.
  //
  // IMPORTANT: model turns can include a `thoughtSignature` field on functionCall
  // parts. It MUST be echoed back on subsequent turns or Gemini errors. So we
  // preserve the full parts array from the model response verbatim instead of
  // reconstructing individual fields.
  type GeminiPart =
    | { text: string }
    | { functionCall: { name: string; args: unknown; thoughtSignature?: string } }
    | { functionResponse: { name: string; response: unknown } }
    | Record<string, unknown>
  const contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = []

  contents.push({
    role: 'user',
    parts: [{ text: `Today's date is ${new Date().toISOString().slice(0, 10)}.` }],
  })

  for (const m of history ?? []) {
    const c = m.content as { text?: string; parts?: GeminiPart[] }
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: c.parts ?? [{ text: c.text ?? '' }] })
    } else if (m.role === 'assistant' && Array.isArray(c.parts)) {
      contents.push({ role: 'model', parts: c.parts })
    } else if (m.role === 'assistant' && c.text) {
      // Backward-compat with earlier text-only rows before the parts refactor.
      contents.push({ role: 'model', parts: [{ text: c.text }] })
    } else if (m.role === 'tool' && Array.isArray(c.parts)) {
      contents.push({ role: 'user', parts: c.parts })
    }
  }

  // Tool-use loop.
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const geminiRes = await callGemini(geminiKey, contents)
    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      const detail = `gemini ${geminiRes.status}: ${errText.slice(0, 200)}`
      await supabase
        .from('assistant_messages')
        .insert({ conversation_id: conversationId, role: 'assistant', content: { text: 'Error: ' + detail } })
      return json({ error: detail, conversation_id: conversationId }, 502)
    }
    const gemJson = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
    }
    const parts = gemJson.candidates?.[0]?.content?.parts ?? []

    // Collect every functionCall — Gemini often emits multiple in parallel
    // ("please fetch both A and B"). We MUST answer all of them in one user
    // turn or the next turn returns empty text.
    const callParts = parts.filter((p) => (p as { functionCall?: unknown }).functionCall) as Array<{
      functionCall: { name: string; args: Record<string, unknown>; thoughtSignature?: string }
    }>

    if (callParts.length === 0) {
      // Text response — persist the entire parts array (for future rehydration)
      // AND a flat text field so the client can render without knowing the shape.
      const text = parts
        .map((p) => (p as { text?: string }).text)
        .filter(Boolean)
        .join('')
      await supabase
        .from('assistant_messages')
        .insert({ conversation_id: conversationId, role: 'assistant', content: { text, parts } })
      await supabase
        .from('assistant_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
      return json({ conversation_id: conversationId, text }, 200)
    }

    // Model wants to call one or more tools. Preserve the FULL parts array
    // (thought signatures live on functionCall parts and must be echoed on next turn).
    contents.push({ role: 'model', parts })
    await supabase.from('assistant_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: { parts },
    })

    // Execute every requested tool call, in order, collecting one
    // functionResponse per functionCall for the next user turn.
    const fnResponseParts: GeminiPart[] = []
    for (const cp of callParts) {
      const started = Date.now()
      let result: unknown
      try {
        result = await runTool(supabase, householdId, cp.functionCall.name, cp.functionCall.args)
      } catch (e) {
        result = { error: (e as Error).message }
      }
      const ms = Date.now() - started
      await supabase.from('assistant_tool_calls').insert({
        conversation_id: conversationId,
        tool_name: cp.functionCall.name,
        args: cp.functionCall.args,
        result_summary: summarize(result),
        ms,
      })
      fnResponseParts.push({
        functionResponse: { name: cp.functionCall.name, response: result },
      })
    }

    contents.push({ role: 'user', parts: fnResponseParts })
    await supabase.from('assistant_messages').insert({
      conversation_id: conversationId,
      role: 'tool',
      content: { parts: fnResponseParts },
    })
  }

  const errText = 'turn limit exceeded — try rephrasing more directly'
  await supabase
    .from('assistant_messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content: { text: 'Error: ' + errText } })
  return json({ error: errText, conversation_id: conversationId }, 500)
})

// ─── Gemini + tools ─────────────────────────────────────────────────────────

async function callGemini(apiKey: string, contents: unknown) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      tools: [{ functionDeclarations: TOOLS }],
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.2 },
    }),
  })
}

async function runTool(
  supabase: SupabaseClient,
  householdId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'query_transactions':
      return await queryTransactions(supabase, args)
    case 'monthly_summary':
      return await monthlySummary(supabase, householdId, args.year as number)
    case 'category_breakdown':
      return await categoryBreakdown(supabase, args.year as number, args.month as number)
    case 'list_budgets':
      return await listBudgets(supabase)
    case 'list_savings_goals':
      return await listSavingsGoals(supabase)
    case 'list_fixed_deductions':
      return await listFixedDeductions(supabase)
    case 'current_balance':
      return await currentBalance(supabase, householdId)
    case 'investment_readiness':
      return await investmentReadiness(supabase, householdId)
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}

async function queryTransactions(supabase: SupabaseClient, args: Record<string, unknown>) {
  let q = supabase
    .from('transactions')
    .select(
      'date, description, amount, type, category:categories(name, group_type), account:accounts(name)',
    )
    .order('date', { ascending: false })
  if (typeof args.start_date === 'string') q = q.gte('date', args.start_date)
  if (typeof args.end_date === 'string') q = q.lte('date', args.end_date)
  if (typeof args.type === 'string') q = q.eq('type', args.type)
  if (Array.isArray(args.category_names) && args.category_names.length > 0) {
    // Filter by joined category name — PostgREST allows via nested filter syntax.
    q = q.in('category.name', args.category_names as string[])
  }
  const limit = Math.min(Number(args.limit ?? 100) || 100, 500)
  q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return { rows: data ?? [], count: data?.length ?? 0 }
}

async function monthlySummary(supabase: SupabaseClient, householdId: string, year: number) {
  const yr = year || new Date().getFullYear()
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('date, amount, type, category:categories(group_type)')
    .gte('date', `${yr}-01-01`)
    .lte('date', `${yr}-12-31`)
  if (error) throw error
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    fixed: 0,
    variable: 0,
    saved: 0,
  }))
  for (const t of txs ?? []) {
    const m = Number(t.date.slice(5, 7)) - 1
    const row = months[m]
    const amt = Number((t as { amount: string | number }).amount)
    if (t.type === 'credit') row.income += amt
    else {
      const g = (t.category as { group_type?: string } | null)?.group_type
      if (g === 'fixed') row.fixed += amt
      else if (g === 'variable') row.variable += amt
    }
  }
  for (const r of months) r.saved = r.income - r.fixed - r.variable
  return { year: yr, months }
}

async function categoryBreakdown(supabase: SupabaseClient, year: number, month: number) {
  const yr = year || new Date().getFullYear()
  const mo = String(month).padStart(2, '0')
  const start = `${yr}-${mo}-01`
  const endDate = new Date(Date.UTC(yr, month, 0)).toISOString().slice(0, 10)
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('amount, type, category:categories(name, group_type)')
    .gte('date', start)
    .lte('date', endDate)
  if (error) throw error
  const buckets = new Map<
    string,
    { name: string; group_type: string; amount: number; count: number }
  >()
  for (const t of txs ?? []) {
    const cat = t.category as { name: string; group_type: string } | null
    if (!cat) continue
    const cur = buckets.get(cat.name) ?? {
      name: cat.name,
      group_type: cat.group_type,
      amount: 0,
      count: 0,
    }
    cur.amount += Number((t as { amount: string | number }).amount)
    cur.count += 1
    buckets.set(cat.name, cur)
  }
  return { year: yr, month, categories: Array.from(buckets.values()).sort((a, b) => b.amount - a.amount) }
}

// Every tool below returns an OBJECT — never a bare array. Gemini's
// functionResponse.response field must be a proto Struct (JSON object),
// otherwise the next generateContent call rejects with
// "proto field is not repeating, can not start list".

async function listBudgets(supabase: SupabaseClient) {
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('monthly_amount, alert_threshold_pct, active, category:categories(name)')
  if (error) throw error
  return { budgets: budgets ?? [] }
}

async function listSavingsGoals(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('name, target_amount, target_date, starts_on, source_category:categories!source_category_id(name)')
  if (error) throw error
  return { goals: data ?? [] }
}

async function listFixedDeductions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('fixed_deductions')
    .select('name, day_of_month, amount, enabled, category:categories(name)')
    .eq('enabled', true)
  if (error) throw error
  return { deductions: data ?? [] }
}

async function currentBalance(supabase: SupabaseClient, _householdId: string) {
  const { data: setup } = await supabase
    .from('setup')
    .select('starting_balance, starting_balance_date')
    .maybeSingle()
  const startingBalance = Number((setup as { starting_balance?: string | number } | null)?.starting_balance ?? 0)
  const startingDate = (setup as { starting_balance_date?: string } | null)?.starting_balance_date ?? null
  let q = supabase.from('transactions').select('amount, type')
  if (startingDate) q = q.gte('date', startingDate)
  const { data: txs, error } = await q
  if (error) throw error
  let balance = startingBalance
  for (const t of txs ?? []) {
    const amt = Number((t as { amount: string | number }).amount)
    balance += t.type === 'credit' ? amt : -amt
  }
  return { starting_balance: startingBalance, current_balance: balance, as_of: new Date().toISOString().slice(0, 10) }
}

async function investmentReadiness(supabase: SupabaseClient, householdId: string) {
  // Emergency-fund coverage = current_balance / avg monthly essential spend.
  // "Essential" = fixed-group debits over trailing 90 days ÷ 3.
  const [balanceRes, txsRes, debtsRes] = await Promise.all([
    (async () => {
      const { data: setup } = await supabase
        .from('setup')
        .select('starting_balance, starting_balance_date')
        .maybeSingle()
      const startingBalance = Number(
        (setup as { starting_balance?: string | number } | null)?.starting_balance ?? 0,
      )
      const startingDate =
        (setup as { starting_balance_date?: string } | null)?.starting_balance_date ?? null
      let q = supabase.from('transactions').select('amount, type')
      if (startingDate) q = q.gte('date', startingDate)
      const { data: txs, error } = await q
      if (error) throw error
      let balance = startingBalance
      for (const t of txs ?? []) {
        const amt = Number((t as { amount: string | number }).amount)
        balance += t.type === 'credit' ? amt : -amt
      }
      return balance
    })(),
    (async () => {
      const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, category:categories(group_type)')
        .gte('date', since)
      if (error) throw error
      return data ?? []
    })(),
    (async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('name, debt_type, apr, monthly_payment, original_balance, first_payment_date')
        .eq('active', true)
      if (error) throw error
      return data ?? []
    })(),
  ])

  const currentBalance = balanceRes
  let fixedSpend90 = 0
  let variableSpend90 = 0
  let income90 = 0
  for (const t of txsRes) {
    const amt = Number((t as { amount: string | number }).amount)
    if (t.type === 'credit') {
      income90 += amt
    } else {
      const g = (t.category as { group_type?: string } | null)?.group_type
      if (g === 'fixed') fixedSpend90 += amt
      else if (g === 'variable') variableSpend90 += amt
    }
  }
  const avgMonthlyEssential = fixedSpend90 / 3
  const avgMonthlyTotalSpend = (fixedSpend90 + variableSpend90) / 3
  const avgMonthlyIncome = income90 / 3
  const emergencyMonths = avgMonthlyEssential > 0 ? currentBalance / avgMonthlyEssential : null
  const savingsRate3mo =
    avgMonthlyIncome > 0
      ? Math.max(0, (avgMonthlyIncome - avgMonthlyTotalSpend) / avgMonthlyIncome)
      : null

  // Debt breakdown — flag anything ≥7% APR as "high interest" for the ladder.
  const HIGH_APR_THRESHOLD = 0.07
  let totalDebt = 0
  let totalMonthlyDebtPayment = 0
  let highAprDebtTotal = 0
  const debts = (debtsRes as Array<{
    name: string
    debt_type: string
    apr: number | string
    monthly_payment: number | string
    original_balance: number | string
    first_payment_date: string
  }>).map((d) => {
    const apr = Number(d.apr)
    const monthlyPayment = Number(d.monthly_payment)
    const originalBalance = Number(d.original_balance)
    // Rough current balance: original minus principal already paid, without
    // running the full amortization here (the model can call more tools if it needs precision).
    const monthsElapsed = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(d.first_payment_date + 'T00:00:00Z').getTime()) /
          (30 * 86400_000),
      ),
    )
    const monthlyRate = apr / 12
    let bal = originalBalance
    for (let i = 0; i < monthsElapsed && bal > 0; i++) {
      const interest = bal * monthlyRate
      const principal = Math.max(0, monthlyPayment - interest)
      if (principal <= 0) {
        bal = originalBalance
        break
      }
      bal = Math.max(0, bal - principal)
    }
    totalDebt += bal
    totalMonthlyDebtPayment += monthlyPayment
    if (apr >= HIGH_APR_THRESHOLD) highAprDebtTotal += bal
    return {
      name: d.name,
      type: d.debt_type,
      apr_pct: round(apr * 100, 2),
      monthly_payment: monthlyPayment,
      approx_current_balance: round(bal, 2),
      is_high_apr: apr >= HIGH_APR_THRESHOLD,
    }
  })

  const debtToIncome =
    avgMonthlyIncome > 0 ? totalMonthlyDebtPayment / avgMonthlyIncome : null

  return {
    as_of: new Date().toISOString().slice(0, 10),
    current_balance: round(currentBalance, 2),
    avg_monthly_essential_spend: round(avgMonthlyEssential, 2),
    avg_monthly_total_spend: round(avgMonthlyTotalSpend, 2),
    avg_monthly_income: round(avgMonthlyIncome, 2),
    emergency_fund_months: emergencyMonths === null ? null : round(emergencyMonths, 1),
    emergency_fund_target_range_months: [3, 6],
    savings_rate_3mo: savingsRate3mo === null ? null : round(savingsRate3mo, 3),
    debts,
    total_debt: round(totalDebt, 2),
    total_monthly_debt_payment: round(totalMonthlyDebtPayment, 2),
    high_apr_debt_total: round(highAprDebtTotal, 2),
    high_apr_threshold_pct: HIGH_APR_THRESHOLD * 100,
    debt_to_income_ratio: debtToIncome === null ? null : round(debtToIncome, 3),
    disclaimer:
      'Educational context only. Not personalized investment advice. User should consult a licensed advisor for allocation, product, or tax decisions.',
  }
}

function round(n: number, digits: number): number {
  const p = Math.pow(10, digits)
  return Math.round(n * p) / p
}

function summarize(result: unknown): string {
  if (result == null) return 'null'
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (Array.isArray(r.rows)) return `${(r.rows as unknown[]).length} rows`
    if (Array.isArray(r.months)) return `12 months for ${r.year}`
    if (Array.isArray(r.categories)) return `${(r.categories as unknown[]).length} categories`
    if (Array.isArray(result)) return `${result.length} items`
    if ('current_balance' in r && 'emergency_fund_months' in r)
      return `readiness: ${r.emergency_fund_months}mo emergency, ${r.savings_rate_3mo == null ? '—' : `${Math.round(Number(r.savings_rate_3mo) * 100)}%`} savings rate`
    if ('current_balance' in r) return `balance=${r.current_balance}`
  }
  return JSON.stringify(result).slice(0, 80)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
