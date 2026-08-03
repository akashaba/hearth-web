-- Categories (global reference data) and accounts (per household).

create type public.category_group as enum ('income', 'fixed', 'variable');
create type public.transaction_type as enum ('debit', 'credit');

-- Categories: global — same list for every user, seeded in supabase/seed.sql.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  group_type public.category_group not null,
  default_type public.transaction_type not null,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_group_sort_idx on public.categories(group_type, sort_order);

alter table public.categories enable row level security;

create policy "categories_select_all_authenticated" on public.categories
  for select using (auth.role() = 'authenticated');

-- Accounts: per household (Checking, Credit Card, etc).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index accounts_household_idx on public.accounts(household_id);

alter table public.accounts enable row level security;

create policy "accounts_select_member" on public.accounts
  for select using (public.is_household_member(household_id));
create policy "accounts_insert_member" on public.accounts
  for insert with check (public.is_household_member(household_id));
create policy "accounts_update_member" on public.accounts
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "accounts_delete_member" on public.accounts
  for delete using (public.is_household_member(household_id));
