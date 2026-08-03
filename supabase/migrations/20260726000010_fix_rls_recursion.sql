-- Fix RLS recursion introduced in migration 001.
--
-- The original `household_members` select policy called `is_household_member(household_id)`,
-- which internally reads from `household_members`, which triggers the same policy
-- again → infinite recursion → 500 errors on every downstream household-scoped query
-- and 400 on `bootstrap_household()` (which selects from households at return time).
--
-- Two changes:
--   1. Replace the household_members select policy with a direct user_id check.
--      A user can see only their own membership rows. That's enough for
--      is_household_member() to work correctly (which only queries rows where
--      user_id = caller's sub anyway). Post-invite multi-member visibility will
--      need a separate migration.
--   2. Mark is_household_member() as SECURITY DEFINER so it bypasses RLS on
--      household_members regardless of what policies get added later. Safe
--      because the query filters on the caller's own sub, so it can only reveal
--      whether the caller belongs to a given household — which they already know.

drop policy if exists "household_members_select_member" on public.household_members;

create policy "household_members_select_own" on public.household_members
  for select using (user_id = auth.jwt() ->> 'sub');

create or replace function public.is_household_member(hid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid
      and user_id = auth.jwt() ->> 'sub'
  )
$$;

-- Ask PostgREST to reload its cached schema so the updated function signature is picked up.
notify pgrst, 'reload schema';
