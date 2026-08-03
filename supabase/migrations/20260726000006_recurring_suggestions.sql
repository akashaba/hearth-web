-- Suggestions produced by the weekly recurring-detection sweep.
-- Cron edge function writes rows here; the app lets the user accept/dismiss them.

create table public.recurring_suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  merchant text not null,
  avg_amount numeric(12,2) not null,
  avg_day_of_month int not null check (avg_day_of_month between 1 and 31),
  suggested_category_id uuid references public.categories(id) on delete set null,
  occurrence_count int not null,
  first_seen date not null,
  last_seen date not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (household_id, merchant, avg_amount)
);

create index recurring_suggestions_household_status_idx
  on public.recurring_suggestions(household_id, status);

alter table public.recurring_suggestions enable row level security;

create policy "recurring_suggestions_select_member" on public.recurring_suggestions
  for select using (public.is_household_member(household_id));

-- Clients don't insert (cron does), but they update to change status.
create policy "recurring_suggestions_update_member" on public.recurring_suggestions
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
