-- The ledger + Setup + Fixed Deductions. Core CRUD tables.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  date date not null,
  description text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  type public.transaction_type not null,
  notes text,
  -- receipt_id FK added in migration 005 once the receipts table exists.
  receipt_id uuid,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index transactions_household_date_idx on public.transactions(household_id, date desc);
create index transactions_category_idx on public.transactions(category_id);
create index transactions_account_idx on public.transactions(account_id);

alter table public.transactions enable row level security;

create policy "transactions_select_member" on public.transactions
  for select using (public.is_household_member(household_id));
create policy "transactions_insert_member" on public.transactions
  for insert with check (public.is_household_member(household_id));
create policy "transactions_update_member" on public.transactions
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "transactions_delete_member" on public.transactions
  for delete using (public.is_household_member(household_id));

-- Setup: one row per household.
create table public.setup (
  household_id text primary key references public.households(id) on delete cascade,
  starting_balance numeric(12,2) not null default 0,
  starting_balance_date date not null default current_date,
  paycheck_amount numeric(12,2) not null default 0,
  paycheck_category_id uuid references public.categories(id) on delete set null,
  first_payday date,
  updated_at timestamptz not null default now()
);

alter table public.setup enable row level security;

create policy "setup_select_member" on public.setup
  for select using (public.is_household_member(household_id));
create policy "setup_insert_member" on public.setup
  for insert with check (public.is_household_member(household_id));
create policy "setup_update_member" on public.setup
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));

-- Fixed Deductions: recurring bills.
create table public.fixed_deductions (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid not null references public.categories(id) on delete restrict,
  notes text,
  enabled bool not null default true,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index fixed_deductions_household_idx on public.fixed_deductions(household_id);

alter table public.fixed_deductions enable row level security;

create policy "fixed_deductions_select_member" on public.fixed_deductions
  for select using (public.is_household_member(household_id));
create policy "fixed_deductions_insert_member" on public.fixed_deductions
  for insert with check (public.is_household_member(household_id));
create policy "fixed_deductions_update_member" on public.fixed_deductions
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "fixed_deductions_delete_member" on public.fixed_deductions
  for delete using (public.is_household_member(household_id));
