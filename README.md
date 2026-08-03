# hearth-web

Next.js 15 + shadcn/ui + Supabase + Clerk. **Hearth** — personal finance for your household. See [`CLAUDE.md`](CLAUDE.md) for architecture, [`docs/spec/features.md`](docs/spec/features.md) for the feature contract, and [`docs/design/design-system.md`](docs/design/design-system.md) for the visual language.

## First-time setup

You need: **Node 20+**, **pnpm**, **Docker** (for local Supabase), and the **Supabase CLI** (`brew install supabase/tap/supabase` on macOS, `scoop install supabase` on Windows, or download from https://github.com/supabase/cli/releases).

### 1. Install deps

```bash
pnpm install
```

### 2. Start local Supabase

```bash
pnpm supabase:start
```

First run pulls the Postgres + Studio + Storage images and can take a few minutes. When it finishes it prints your local URLs and anon key — copy the URL and anon key into `.env.local` (see step 4).

### 3. Set up Clerk

- Create a project at https://dashboard.clerk.com.
- In **JWT Templates**, click **New template → Supabase**. This creates a template named `supabase` (name must be exact).
- Copy the **Publishable key** and **Secret key** from the Clerk dashboard.
- Copy your Clerk **Frontend API domain** (looks like `bold-tiger-42.clerk.accounts.dev`) — you'll paste it into `supabase/config.toml` under `[auth.third_party.clerk]`. Uncomment those lines and set `domain = "<yours>"`, then re-run `pnpm supabase:start` to pick up the change.

### 4. Fill `.env.local`

```bash
cp .env.local.example .env.local
# Then edit .env.local with your Clerk keys + Supabase anon key.
```

### 5. Apply migrations + seed

```bash
pnpm supabase:reset
```

This runs every SQL file in `supabase/migrations/` then applies `supabase/seed.sql` (the global category list).

### 6. Generate TypeScript types

```bash
pnpm supabase:types
```

Writes `src/shared/types.gen.ts` with the full DB type. Commit it. Also `rsync` this file into the mobile repo (see the `/sync-shared-to-mobile` skill).

### 7. Install shadcn primitives

The `components.json` is already configured. Add the components you need:

```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu input label select separator sheet table tabs toast
```

### 8. Run the app

```bash
pnpm dev
```

Open http://127.0.0.1:3000. You'll be redirected to Clerk sign-in, then bounced to `/` (the Dashboard) which auto-creates a household of size 1 on your first authenticated request.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | Production build + serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint via `next lint` |
| `pnpm supabase:start` / `:stop` | Boot / stop local Supabase stack |
| `pnpm supabase:reset` | Reapply all migrations + seed (destructive to local DB) |
| `pnpm supabase:types` | Regenerate `src/shared/types.gen.ts` |
| `pnpm supabase:test` | Run pgTAP tests under `supabase/tests/` |

## Layout

```
app/
  (auth)/                Clerk sign-in / sign-up
  (app)/                 Behind auth — layout auto-bootstraps household
    page.tsx             Dashboard
    ...                  Other feature routes (added in follow-up slices)
components/
  ui/                    shadcn primitives (generated via `pnpm dlx shadcn add`)
  nav/                   Sidebar
lib/
  supabase/              Clerk-JWT-injecting browser + server clients
  query/                 TanStack Query provider + shared query keys
  hooks/                 Reusable client hooks (useCurrentHousehold, ...)
  utils.ts               `cn()` — Tailwind classname helper
src/shared/              Canonical shared TS (mirrored to mobile via /sync-shared-to-mobile)
  categories.ts          Seed list + group/type enums
  format.ts              Money/date formatters
  projections.ts         Biweekly + fixed-deduction math
  schemas/               Zod schemas per entity
  types.gen.ts           Generated DB types (regenerate via `pnpm supabase:types`)
supabase/
  config.toml            Local Supabase config
  migrations/            SQL migrations, timestamp-prefixed
  seed.sql               Global categories seed
```

## Follow-ups (next slices)

1. **Dashboard UI** — KPI cards, current-month category breakdown table, Quick Entry modal.
2. **Transactions CRUD** — table + add/edit/delete modal.
3. **Setup form** — starting balance, biweekly income, fixed deductions grid.
4. **Bank Import** — paste CSV, review, batch insert.
5. **Projected Schedule + Monthly Summary + Category Breakdown** pages.
6. **Budgets + Savings Goals** screens.
7. **Receipts + `parse-receipt` Edge Function** — depends on mobile scaffold.
8. **AI Assistant chat** — depends on `ask` Edge Function.
9. **Weekly Digest + push infra** — depends on `pg_cron` + `generate-weekly-digest` Edge Function.
