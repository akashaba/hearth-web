-- Auto-create a default "Checking" account on household bootstrap, and backfill any
-- household that already exists but doesn't have an account. Without this, the very first
-- transaction insert fails because there's no account_id to reference.

create or replace function public.bootstrap_household()
returns setof public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.jwt() ->> 'sub';
  email text := auth.jwt() ->> 'email';
  hid text;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  select h.id into hid
    from public.households h
    join public.household_members m on m.household_id = h.id
    where m.user_id = uid
    limit 1;

  if hid is null then
    hid := gen_random_uuid()::text;
    insert into public.households (id, name, owner_user_id, timezone)
      values (hid, coalesce(nullif(email, ''), 'My') || ' Budget', uid, 'UTC');
    insert into public.household_members (household_id, user_id, role)
      values (hid, uid, 'owner');
  end if;

  -- Ensure the household has at least one account. Idempotent.
  if not exists (select 1 from public.accounts where household_id = hid) then
    insert into public.accounts (household_id, name, created_by_user_id)
      values (hid, 'Checking', uid);
  end if;

  return query select * from public.households where id = hid;
end $$;

-- Backfill: give every existing household a default Checking account if it has none.
insert into public.accounts (household_id, name, created_by_user_id)
select h.id, 'Checking', h.owner_user_id
from public.households h
where not exists (select 1 from public.accounts a where a.household_id = h.id);
