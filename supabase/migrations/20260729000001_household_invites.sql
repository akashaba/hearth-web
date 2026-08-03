-- Household invite flow: two SECURITY DEFINER RPCs the client calls to
-- generate + accept 6-character codes. Codes live in `household_invites`
-- (created in migration 001) with a 7-day expiry.

-- ── generate_invite_code ─────────────────────────────────────────────────
-- Owner-only. Generates a fresh 6-char alphanumeric code (no ambiguous chars),
-- inserts a row into household_invites, returns the code.

create or replace function public.generate_invite_code(hid text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.jwt() ->> 'sub';
  is_owner boolean;
  new_code text;
  attempts int := 0;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = uid and role = 'owner'
  ) into is_owner;
  if not is_owner then raise exception 'not the household owner'; end if;

  -- Simple retry loop for uniqueness collisions (extremely unlikely at 6 chars).
  loop
    -- 6 chars from a friendly alphabet: no 0/O/1/I/L to avoid mis-transcription.
    new_code := upper(substring(
      translate(encode(gen_random_bytes(9), 'base64'), 'abcdefghijklmnopqrstuvwxyz0/+=oil', 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'),
      1, 6
    ));
    begin
      insert into public.household_invites (code, household_id, created_by_user_id)
      values (new_code, hid, uid);
      return new_code;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 5 then raise exception 'could not generate a unique code'; end if;
    end;
  end loop;
end $$;

revoke all on function public.generate_invite_code(text) from public;
grant execute on function public.generate_invite_code(text) to authenticated;

-- ── accept_invite_code ──────────────────────────────────────────────────
-- Anyone authenticated. Given a code, atomically:
--   1. Look up unconsumed, unexpired invite.
--   2. Add caller as a member of the target household (skip if already member).
--   3. Mark the invite consumed.
--   4. If the caller was the sole owner of an empty solo household (no
--      transactions), delete it so they don't end up in "two households"
--      with orphaned auto-created data. Common case: brand-new user was
--      invited by a partner right after sign-up.

create or replace function public.accept_invite_code(code_input text)
returns setof public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.jwt() ->> 'sub';
  invite record;
  empty_hh text;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  code_input := upper(trim(code_input));
  if code_input is null or length(code_input) <> 6 then
    raise exception 'invalid code';
  end if;

  select * into invite
  from public.household_invites
  where code = code_input
    and consumed_by_user_id is null
    and expires_at > now();
  if not found then raise exception 'invite not found, already used, or expired'; end if;

  -- Idempotent membership insert.
  insert into public.household_members (household_id, user_id, role)
  values (invite.household_id, uid, 'member')
  on conflict (household_id, user_id) do nothing;

  -- Mark consumed.
  update public.household_invites
  set consumed_by_user_id = uid, consumed_at = now()
  where code = code_input;

  -- Clean up any solo households the caller owns that have no transactions.
  -- Cascade removes memberships, setup, deductions, etc.
  for empty_hh in
    select h.id
    from public.households h
    join public.household_members m on m.household_id = h.id and m.user_id = uid
    where h.owner_user_id = uid
      and h.id <> invite.household_id
      and not exists (select 1 from public.transactions t where t.household_id = h.id)
  loop
    delete from public.households where id = empty_hh;
  end loop;

  return query select * from public.households where id = invite.household_id;
end $$;

revoke all on function public.accept_invite_code(text) from public;
grant execute on function public.accept_invite_code(text) to authenticated;

-- Allow members to LIST other members of the same household (for the roster UI).
-- The existing select policy only lets you see YOUR OWN membership rows.
drop policy if exists "household_members_select_all_in_shared" on public.household_members;
create policy "household_members_select_all_in_shared" on public.household_members
  for select using (public.is_household_member(household_id));

-- Also let members see pending invites on households they belong to (already
-- exists via policy in migration 001 — leaving that alone).
