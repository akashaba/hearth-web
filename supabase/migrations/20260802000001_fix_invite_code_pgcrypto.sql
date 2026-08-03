-- Fix: generate_invite_code was calling `gen_random_bytes(9)` (from pgcrypto)
-- unqualified, but the function's `search_path = public` can't see extensions
-- installed in the `extensions` schema (Supabase default).
--
-- Two-part fix:
--   1. Make sure pgcrypto is installed.
--   2. Reference the function with its full schema path — `extensions.gen_random_bytes`.
--
-- Safe to re-run — `create extension if not exists` + `create or replace function`.

create extension if not exists pgcrypto with schema extensions;

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

  loop
    -- 6 chars from a friendly alphabet: no 0/O/1/I/L to avoid mis-transcription.
    -- Schema-qualified gen_random_bytes since search_path = public.
    new_code := upper(substring(
      translate(encode(extensions.gen_random_bytes(9), 'base64'), 'abcdefghijklmnopqrstuvwxyz0/+=oil', 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'),
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
