-- Mobile push tokens + idempotency tables for weekly digest and per-budget-threshold notifications.

-- Device tokens: per USER (not household — a phone follows the user).
create table public.device_tokens (
  token text primary key,
  user_id text not null,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index device_tokens_user_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own" on public.device_tokens
  for select using (user_id = auth.jwt() ->> 'sub');
create policy "device_tokens_insert_own" on public.device_tokens
  for insert with check (user_id = auth.jwt() ->> 'sub');
create policy "device_tokens_update_own" on public.device_tokens
  for update using (user_id = auth.jwt() ->> 'sub')
             with check (user_id = auth.jwt() ->> 'sub');
create policy "device_tokens_delete_own" on public.device_tokens
  for delete using (user_id = auth.jwt() ->> 'sub');

-- Digest send log — used by the cron edge function to skip households already sent to this week.
create table public.digest_sends (
  household_id text not null references public.households(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (household_id, sent_at)
);

create index digest_sends_household_recent_idx on public.digest_sends(household_id, sent_at desc);

alter table public.digest_sends enable row level security;
-- No client policies — written only by the cron edge function using the service-role key.

-- Push dedupe: prevents duplicate budget-threshold notifications when multiple
-- transactions cross the same threshold on the same day.
create table public.push_dedupe (
  key text primary key,
  sent_at timestamptz not null default now()
);

alter table public.push_dedupe enable row level security;
-- No client policies — internal only.
