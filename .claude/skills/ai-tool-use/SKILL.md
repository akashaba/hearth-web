---
name: ai-tool-use
description: Give Gemini (or Claude) controlled, read-only access to a caller's data via an edge function using the model's tool-use / function-calling interface. Use for the AI Financial Assistant, weekly digest generation, or any feature where the model needs to query the DB. Enforces RLS-safe, read-only, rate-limited access patterns.
---

# ai-tool-use

Used by the **AI Financial Assistant** (`ask`) and **Weekly AI Digest** (`generate-weekly-digest`) edge functions. Any future feature that gives an LLM access to user data must follow this pattern.

## Core principles

1. **RLS is the enforcement layer.** The model never sees the service-role key. Tool implementations run with the caller's Supabase client (or with a system-owned client for cron jobs), and RLS caps what any tool can read to the caller's household.
2. **Read-only in phase 1.** No tool that writes to the DB, deletes data, sends a message, or invokes another edge function. If the model wants to mutate, it returns a suggestion the user confirms in the UI.
3. **Fixed tool schema.** The tools available to the model are declared once, alphabetically. Do not conditionally include/exclude tools per request — the model's behavior becomes non-reproducible.
4. **Rate-limited AND turn-limited.** Rate limit = N model calls per household per day. Turn limit = the tool-use loop can run at most 8 iterations per user question (prevents runaway tool spirals).
5. **Every tool call is logged.** Row into `assistant_tool_calls(conversation_id, tool_name, args jsonb, result_summary text, ms int, created_at)`. Debugging AI features without this log is agony.

## Tool schema (Gemini function-calling shape)

```ts
const TOOLS = [
  {
    name: 'query_transactions',
    description: 'Fetch transactions for the caller\'s household with optional filters.',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        category_names: { type: 'array', items: { type: 'string' } },
        type: { type: 'string', enum: ['debit', 'credit'] },
        limit: { type: 'integer', default: 100, maximum: 500 },
      },
    },
  },
  {
    name: 'monthly_summary',
    description: 'The 12-row year summary for a given year — income, fixed, variable, saved, cumulative.',
    parameters: { type: 'object', properties: { year: { type: 'integer' } }, required: ['year'] },
  },
  {
    name: 'category_breakdown',
    description: 'Category totals for a specific month.',
    parameters: {
      type: 'object',
      properties: { year: { type: 'integer' }, month: { type: 'integer', minimum: 1, maximum: 12 } },
      required: ['year', 'month'],
    },
  },
  {
    name: 'list_budgets',
    description: 'All active budgets for the household with current-month progress.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_savings_goals',
    description: 'All savings goals for the household with current progress.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_fixed_deductions',
    description: 'Enabled recurring bills from Setup.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'current_balance',
    description: 'The household\'s current balance today.',
    parameters: { type: 'object', properties: {} },
  },
]
```

## Loop skeleton

```ts
const conversation = [/* ...history from DB... */, { role: 'user', parts: [{ text: message }] }]

for (let turn = 0; turn < 8; turn++) {
  const resp = await callGemini('gemini-2.5-pro', conversation, TOOLS)
  const call = resp.candidates[0].content.parts[0].functionCall
  if (!call) {
    // Model returned text — final answer
    return { assistant: resp.candidates[0].content.parts[0].text }
  }
  // Execute the tool with the CALLER'S Supabase client
  const start = Date.now()
  const result = await TOOL_IMPL[call.name](supabase, call.args)
  await logToolCall(conversationId, call.name, call.args, summarize(result), Date.now() - start)
  conversation.push(
    { role: 'model', parts: [{ functionCall: call }] },
    { role: 'function', parts: [{ functionResponse: { name: call.name, response: result } }] },
  )
}
throw new Error('turn limit exceeded')
```

## Tool implementations

Each `TOOL_IMPL[name]` is a plain async function taking `(supabase, args)` and returning a JSON-serializable value. Use TanStack-Query-style query keys internally for consistency, but the DB queries themselves are direct:

```ts
async function query_transactions(supabase, args) {
  let q = supabase.from('transactions').select('date, description, amount, type, category:categories(name, group_type), account:accounts(name)')
  if (args.start_date) q = q.gte('date', args.start_date)
  if (args.end_date) q = q.lte('date', args.end_date)
  if (args.category_names) q = q.in('category.name', args.category_names)
  if (args.type) q = q.eq('type', args.type)
  q = q.order('date', { ascending: false }).limit(Math.min(args.limit ?? 100, 500))
  const { data, error } = await q
  if (error) throw error
  return data
}
```

RLS on `transactions` gates the results to the caller's household automatically — the tool code does not filter by household_id explicitly. **If a tool needs a service-role client, that's a red flag — reconsider the design.**

## System prompt (assistant)

```
You are a personal finance assistant. You have read-only access to the user's transactions,
budgets, savings goals, and fixed deductions via the provided tools. Answer their questions
concisely. When they ask "should I", offer 1-2 concrete options with numbers — never generic
advice. Use dollar amounts, not percentages, unless the user asks for percentages. If a
question cannot be answered from the available data, say so plainly and suggest what to
track. Never invent numbers.
```

Store the prompt in `supabase/functions/_shared/prompts.ts` — never inline it in the handler where it becomes drift bait.

## Streaming

Web + mobile stream the assistant reply. Use Supabase Edge Functions' `Response` with a `ReadableStream` body and SSE format (`data: <json>\n\n`). Client uses `EventSource` (web) or `expo-fetch-stream` (mobile) to append tokens as they arrive.

## Never

- Give the model a tool that writes to any table.
- Use `adminClient()` inside a tool implementation. Tools always run under the caller's RLS.
- Skip the turn limit. Runaway tool spirals will empty your Gemini budget.
- Log full raw tool results (they may contain hundreds of transaction rows). Log a summary (`result_summary text`) — e.g., `"142 rows, total $3,821.44"`.
- Trust that the model will always call a tool. Sometimes it invents numbers — the system prompt discourages it, but validate anything shown to the user against a tool call in the log when in doubt.
