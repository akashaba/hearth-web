---
name: supabase-migration
description: Author, apply, and verify a Supabase migration. Use whenever a new table, column, index, RLS policy, view, or RPC is needed — including any change touching supabase/migrations. Also handles regenerating TypeScript types so both this repo and the mobile repo compile against the new schema. Run this in the web repo — the mobile repo does not own the schema.
---

# Supabase migration (web repo only)

Use this for every schema change. Do **not** edit the DB through the Supabase dashboard — migrations are the source of truth. This skill lives in the web repo because **the web repo owns the schema**; the mobile repo consumes it.

## Pre-flight

1. Confirm the change is warranted by `docs/spec/features.md`. If the spec doesn't cover it, stop and update the spec first (in **both** this repo and the mobile repo — they must match).
2. `supabase status` — the local stack must be running (`supabase start` if not).
3. `git status` — no uncommitted DB drift. If there is, ask before proceeding.

## Write the migration

Create the file with:

```bash
supabase migration new <snake_verb_name>
```

That yields `supabase/migrations/<timestamp>_<name>.sql`.

Every data table needs:

- `id uuid primary key default gen_random_uuid()`
- **`household_id text not null`** — NOT `user_id`. All data is scoped to a household (a solo user is a household of size 1). See the "Household / Workspace model" section of the spec.
- `created_at timestamptz not null default now()`
- Optionally `created_by_user_id text` for audit trails (Clerk sub of the specific user who created the row) — nullable, no FK. Use this when it matters *who* in a household did the thing (adding a transaction, editing a budget). Skip it for tables where authorship isn't interesting.
- An index on `(household_id, ...)` for the primary query pattern
- **RLS enabled** and policies for select/insert/update/delete scoped to households the caller is a member of

Template:

```sql
create table public.<name> (
  id uuid primary key default gen_random_uuid(),
  household_id text not null,
  created_by_user_id text,   -- optional; drop if not needed
  -- ...columns...
  created_at timestamptz not null default now()
);

create index <name>_household_idx on public.<name>(household_id);

alter table public.<name> enable row level security;

-- Helper: "does the caller belong to this household?"
-- Defined once in an early migration:
--   create or replace function public.is_household_member(hid text)
--   returns boolean language sql stable security invoker as $$
--     select exists (
--       select 1 from public.household_members
--       where household_id = hid and user_id = auth.jwt() ->> 'sub'
--     )
--   $$;

create policy "<name>_select_member" on public.<name>
  for select using (public.is_household_member(household_id));

create policy "<name>_insert_member" on public.<name>
  for insert with check (public.is_household_member(household_id));

create policy "<name>_update_member" on public.<name>
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));

create policy "<name>_delete_member" on public.<name>
  for delete using (public.is_household_member(household_id));
```

**The two exceptions to the household-scoping rule:**

- `households` — RLS: `for select using (id in (select household_id from household_members where user_id = auth.jwt() ->> 'sub'))`. Insert/update via a dedicated edge function only.
- `household_members` — RLS: same select scope as above. Insert/update via the invite-accept edge function only (never client-side).

Every other table without exception uses `household_id + is_household_member()`.

Views and RPCs used by clients must also be RLS-safe. Views inherit RLS from their base tables when created without `security definer`. RPCs need `set search_path = public` and, if they touch user data, `security invoker` (the default) so RLS still applies.

**Column types:**
- Money — `numeric(12,2) not null`. Never `float`.
- Day-granular dates — `date not null`. Not `timestamptz`.
- User id — `text not null`. Not `uuid` (Clerk `sub` isn't).

## Apply and verify

```bash
pnpm supabase:reset              # supabase db reset — replays all migrations + seed
pnpm supabase:test               # RLS test suite
```

The RLS test suite (`supabase/tests/`) must cover every new table: a signed-in user sees only their own rows; a different user sees zero. Add a test in the same commit as the migration.

## Regenerate TypeScript types

```bash
pnpm supabase:types              # supabase gen types typescript --local > src/shared/types.gen.ts
```

Commit the regenerated `src/shared/types.gen.ts` in the same PR as the migration.

**Then**, in the mobile repo, run `/sync-shared-from-web` to pull the updated types across. Both apps import DB row types from `@/shared/types.gen` — never redeclare.

## Common mistakes to avoid

- Forgetting `alter table ... enable row level security;` — the table is then wide open even with policies defined.
- Using `auth.uid()` instead of `auth.jwt() ->> 'sub'` — `auth.uid()` returns null when the JWT is Clerk-issued, so every query returns zero rows.
- Adding a `user_id` column instead of `household_id` — silently breaks household sharing forever. Every table is household-scoped from day 1.
- Adding a foreign key to `auth.users` — Clerk is the identity provider; that table isn't the source of truth here.
- Editing an old migration file — write a new one instead. Migrations are append-only once applied.
- Regenerating types but forgetting to sync them to the mobile repo — mobile will break at the next `pnpm typecheck`.
