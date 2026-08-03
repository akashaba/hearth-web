-- Debts (credit cards, student loans, mortgages, etc.).
-- Only the loan TERMS are stored — current balance is always derived from
-- (original_balance, apr, monthly_payment, first_payment_date) + months
-- elapsed via the shared amortize() helper. No mutable balance column so
-- there's no drift and no cron needed.

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  debt_type text not null check (debt_type in (
    'credit_card', 'student_loan', 'mortgage', 'auto', 'personal', 'other'
  )),
  original_balance numeric(12,2) not null check (original_balance > 0),
  apr numeric(6,4) not null check (apr >= 0 and apr < 1),  -- 0.0499 = 4.99%
  monthly_payment numeric(12,2) not null check (monthly_payment > 0),
  first_payment_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  -- Optional link to a fixed_deduction so the payment appears in the
  -- cashflow forecast automatically. If null, forecast won't know about it.
  fixed_deduction_id uuid references public.fixed_deductions(id) on delete set null,
  notes text,
  active bool not null default true,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index debts_household_active_idx on public.debts(household_id, active);

alter table public.debts enable row level security;

create policy "debts_select_member" on public.debts
  for select using (public.is_household_member(household_id));
create policy "debts_insert_member" on public.debts
  for insert with check (public.is_household_member(household_id));
create policy "debts_update_member" on public.debts
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "debts_delete_member" on public.debts
  for delete using (public.is_household_member(household_id));
