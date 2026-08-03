# hearth-web

Next.js web client for **Hearth** (personal finance for your household). Standalone repo — the mobile app lives in its own repo but shares the same Supabase project and Clerk organization.

Read [docs/spec/features.md](docs/spec/features.md) before implementing any user-facing feature, and [docs/design/design-system.md](docs/design/design-system.md) before writing any UI. The `/design-tokens` skill enforces the latter.

## Stack

- Next.js 15, App Router, TypeScript strict
- shadcn/ui + Tailwind CSS + Radix primitives
- Clerk for auth (`@clerk/nextjs`)
- Supabase JS client with Clerk-issued JWT
- TanStack Query for server state
- react-hook-form + zod
- Recharts for charts
- Supabase CLI for migrations (`supabase/` directory)
- Supabase Edge Functions (Deno) for AI + third-party calls: **Gemini 2.5 Flash** (receipt vision, weekly digest) and **Gemini 2.5 Pro** (assistant chat)
- `pg_cron` for scheduled jobs (weekly digest, recurring-transaction detection sweep)
- Resend (or Supabase SMTP) for email delivery
- Expo Push service for sending mobile notifications from edge functions

## Folder layout

```
finance-tracker-web/
  app/
    (auth)/                  Clerk sign-in, sign-up
    (app)/                   Behind auth
      layout.tsx             Sidebar + <UserButton />
      page.tsx               Dashboard
      setup/page.tsx
      transactions/page.tsx
      import/page.tsx        Bank Import (web-only)
      projected/page.tsx
      summary/page.tsx
      categories/[month]/page.tsx
      settings/categories/page.tsx
    api/                     Only when client-side Supabase cannot express it
  components/
    ui/                      shadcn primitives (generated)
    dashboard/               Feature components
    transactions/
    quick-entry/
  lib/
    supabase/                Browser + server client factories (Clerk JWT injected)
    query/                   TanStack Query client + shared query keys
  src/shared/                CANONICAL shared TS — kept in sync with mobile repo
    categories.ts            Master category list + group/type enums
    schemas/                 Zod schemas per entity
    format.ts                Money / date formatters
    projections.ts           Biweekly payday + fixed-deduction date math
  supabase/
    migrations/              SQL migrations (Supabase CLI)
    seed.sql                 Category seed
    tests/                   pgTAP or SQL-based RLS tests
    functions/               Edge Functions (Deno) — invoked by mobile too
      parse-receipt/         Claude-vision receipt OCR (see /edge-function skill)
  middleware.ts              Clerk middleware for (app) routes
```

## Ownership boundaries

- **This repo owns the database schema.** All migrations live here. The mobile app never runs migrations — it just reads/writes tables.
- **This repo owns the canonical shared TS code** under `src/shared/`. When any file in there changes, run `/sync-shared-to-mobile` in the mobile repo in the same session to keep them identical.
- **This repo owns Supabase Edge Functions** under `supabase/functions/`. Mobile invokes them but does not deploy them. Gemini / Resend / other third-party API keys live as Supabase secrets, never in a client binary. See `/edge-function`.
- **This repo owns scheduled jobs** (`pg_cron` schedules under `supabase/migrations/`). See `/scheduled-job`.
- **Push notifications:** this repo sends via Expo Push from edge functions (`/send-push`); the mobile repo owns device-token registration and receive-side handling.

## Auth wiring (Clerk ↔ Supabase)

Clerk issues a JWT via a template named `supabase`. Supabase third-party auth verifies it. RLS policies gate every row by `auth.jwt() ->> 'sub' = user_id`.

Client-side factory in `lib/supabase/browser.ts` — see the `/clerk-supabase-auth` skill for the reference implementation.

Server-side: use `auth().getToken({ template: 'supabase' })` from `@clerk/nextjs/server`. **Never cache a Supabase client across users.**

## Data-fetching pattern

Query keys live in `lib/query/keys.ts`. Reuse them so mutations invalidate correctly:

```ts
export const qk = {
  transactions: (filters?: TxFilters) => ['transactions', filters] as const,
  monthlySummary: (year: number) => ['monthly-summary', year] as const,
  categoryBreakdown: (year: number, month: number) => ['category-breakdown', year, month] as const,
}
```

Every transaction mutation invalidates the KPI queries the Dashboard depends on.

## Forms

- Import the Zod schema from `@/shared/schemas/*`. `useForm({ resolver: zodResolver(schema) })`.
- Money fields use `<CurrencyInput>` — stores `number`, displays formatted via `formatMoney` from `@/shared/format`.
- Category `<Select>` groups options by `group` (Income / Fixed / Variable).

## Charts

- Dashboard: category donut for This Month + 6-month savings trend.
- Monthly Summary: stacked bar (Income / Fixed / Variable) with Saved line overlay.
- Colors come from Tailwind CSS variables so light/dark themes work.

## shadcn install

Use `/shadcn-add`. Not a monorepo, so the standard `pnpm dlx shadcn@latest add ...` at repo root works — but the skill covers `components.json` init and the exact aliases.

## Scripts

```bash
pnpm dev             # Next dev server
pnpm build
pnpm typecheck
pnpm lint
pnpm supabase:reset  # supabase db reset (local dev DB)
pnpm supabase:types  # regenerate src/shared/types.gen.ts from local schema
```

Verify UI changes in a real browser — typecheck is not a substitute.

## Non-negotiables

- **No emojis. Anywhere.** Not in UI copy, headings, buttons, toasts, error messages, migration comments, or code comments. Use a lucide icon component when a visual glyph is needed — the design system is a single icon family.
- **Never render money from strings.** `formatMoney(n)` only.
- **Never call Supabase without an authenticated client.** Empty results because of missing auth look identical to empty state and hide bugs.
- **Never edit generated shadcn files for cosmetic tweaks.** Extend via CVA or wrap in a feature component.
- **Never bypass `src/shared/`** by inlining a formula that has to match mobile. If it must match, it belongs in shared.
- **Server actions only for genuinely server-only operations** (bulk imports, admin ops).
