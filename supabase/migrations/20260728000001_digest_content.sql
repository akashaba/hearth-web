-- Weekly digest: store the generated markdown content per send so the mobile
-- app can render it after a push notification (and users can review past weeks).
alter table public.digest_sends
  add column if not exists content text;

-- The digest_sends table has no client-facing RLS by design — it's written by
-- the cron edge function using the service-role key. Add a member-scoped SELECT
-- policy so the mobile Digest screen can read its household's past digests.
alter table public.digest_sends enable row level security;

drop policy if exists "digest_sends_select_member" on public.digest_sends;
create policy "digest_sends_select_member" on public.digest_sends
  for select using (public.is_household_member(household_id));
