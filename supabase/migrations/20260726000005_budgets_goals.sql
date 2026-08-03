-- Per-category budgets and named savings goals.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_amount numeric(12,2) not null check (monthly_amount > 0),
  alert_threshold_pct int not null default 80 check (alert_threshold_pct between 1 and 100),
  active bool not null default true,
  created_by_user_id text,
  created_at timestamptz not null default now(),
  unique (household_id, category_id)
);

create index budgets_household_idx on public.budgets(household_id);

alter table public.budgets enable row level security;

create policy "budgets_select_member" on public.budgets
  for select using (public.is_household_member(household_id));
create policy "budgets_insert_member" on public.budgets
  for insert with check (public.is_household_member(household_id));
create policy "budgets_update_member" on public.budgets
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "budgets_delete_member" on public.budgets
  for delete using (public.is_household_member(household_id));

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  target_date date,
  source_category_id uuid references public.categories(id) on delete set null,
  starts_on date not null default current_date,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index savings_goals_household_idx on public.savings_goals(household_id);

alter table public.savings_goals enable row level security;

create policy "savings_goals_select_member" on public.savings_goals
  for select using (public.is_household_member(household_id));
create policy "savings_goals_insert_member" on public.savings_goals
  for insert with check (public.is_household_member(household_id));
create policy "savings_goals_update_member" on public.savings_goals
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "savings_goals_delete_member" on public.savings_goals
  for delete using (public.is_household_member(household_id));
