-- Notifications table + auto-deduction plumbing.
--
-- 1. transactions gets `source_deduction_id` — nullable link back to the
--    fixed_deduction that generated the tx (null for manual entries).
--    Unique index on (source_deduction_id, year-month of date) prevents
--    the daily-sweep from double-inserting if it runs twice.
--
-- 2. notifications table — persisted, per-household. read_at is per-user
--    (all household members see the notification; each marks their own
--    read state via `notification_reads`).
--
-- 3. Trigger: every transaction insert generates a notification (with
--    before + after balance baked into meta). Both manual entries and
--    daily-sweep auto-adds fire this — no client code needed.

-- ── 1. transactions.source_deduction_id ─────────────────────────────
alter table public.transactions
  add column if not exists source_deduction_id uuid
    references public.fixed_deductions(id) on delete set null;

-- Idempotency for the daily sweep: only one tx per deduction per month.
-- We use date_trunc('month', date) so the "same month" bucket matches the
-- deduction's monthly cadence regardless of which day it lands on.
create unique index if not exists transactions_source_deduction_month_uidx
  on public.transactions (source_deduction_id, date_trunc('month', date))
  where source_deduction_id is not null;

-- ── 2. notifications ────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  kind text not null check (kind in (
    'transaction',       -- manual expense/income
    'auto_deduction',    -- fixed_deduction fired by daily-sweep
    'upcoming_deduction',-- fires 1 day before a fixed_deduction is due
    'budget_warning',    -- budget crossed alert_threshold_pct (typically 80%)
    'budget_over'        -- budget crossed 100%
  )),
  title text not null,
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  related_href text,     -- e.g. '/transactions', '/budgets'
  created_at timestamptz not null default now()
);

create index if not exists notifications_household_created_idx
  on public.notifications(household_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications_select_member" on public.notifications
  for select using (public.is_household_member(household_id));

-- Members can insert (client hooks might create acknowledgment rows in future).
create policy "notifications_insert_member" on public.notifications
  for insert with check (public.is_household_member(household_id));

-- Members can delete (dismissing).
create policy "notifications_delete_member" on public.notifications
  for delete using (public.is_household_member(household_id));

-- ── 2a. Per-user read state ─────────────────────────────────────────
-- Household notifications are shared. Each member has their own read state.
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notification_reads enable row level security;
create policy "notification_reads_own" on public.notification_reads
  for all using (user_id = auth.jwt() ->> 'sub')
              with check (user_id = auth.jwt() ->> 'sub');

-- ── 3. Trigger: notify on every transaction insert ──────────────────
-- Computes the household balance BEFORE and AFTER this tx and stores both
-- in meta.body has plain text; UI can render either.
create or replace function public.notify_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starting_bal numeric := 0;
  starting_date date;
  balance_after numeric;
  balance_before numeric;
  delta numeric;
  kind_val text;
  title_val text;
  body_val text;
begin
  -- Skip if no household (shouldn't happen).
  if new.household_id is null then return new; end if;

  -- Starting balance from setup (if any).
  select coalesce(s.starting_balance, 0), s.starting_balance_date
    into starting_bal, starting_date
    from public.setup s
    where s.household_id = new.household_id
    limit 1;

  -- Balance AFTER this tx: sum of all credits − debits since starting_date, plus starting_bal.
  select coalesce(starting_bal, 0) + coalesce(
      (select sum(case when t.type = 'credit' then t.amount else -t.amount end)
       from public.transactions t
       where t.household_id = new.household_id
         and (starting_date is null or t.date >= starting_date)),
      0)
    into balance_after;

  delta := case when new.type = 'credit' then new.amount else -new.amount end;
  balance_before := balance_after - delta;

  -- Only notify on expenses (debits). Credits (income) tend to be quiet
  -- signals; user asked for expense alerts specifically.
  if new.type <> 'debit' then return new; end if;

  if new.source_deduction_id is not null then
    kind_val := 'auto_deduction';
    title_val := 'Fixed expense charged: ' || new.description;
    body_val := format(
      'Amount: $%s. Balance was $%s, now $%s.',
      to_char(new.amount, 'FM999G999G990D00'),
      to_char(balance_before, 'FM999G999G990D00'),
      to_char(balance_after, 'FM999G999G990D00')
    );
  else
    kind_val := 'transaction';
    title_val := 'Expense: ' || new.description;
    body_val := format(
      'Amount: $%s. Balance was $%s, now $%s.',
      to_char(new.amount, 'FM999G999G990D00'),
      to_char(balance_before, 'FM999G999G990D00'),
      to_char(balance_after, 'FM999G999G990D00')
    );
  end if;

  insert into public.notifications (household_id, kind, title, body, meta, related_href)
  values (
    new.household_id,
    kind_val,
    title_val,
    body_val,
    jsonb_build_object(
      'tx_id', new.id,
      'amount', new.amount,
      'balance_before', balance_before,
      'balance_after', balance_after,
      'category_id', new.category_id,
      'date', new.date
    ),
    '/transactions'
  );

  return new;
end $$;

drop trigger if exists trg_notify_on_transaction on public.transactions;
create trigger trg_notify_on_transaction
  after insert on public.transactions
  for each row execute function public.notify_on_transaction();
