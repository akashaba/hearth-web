-- Households, membership, invites, and the helper functions used by every subsequent RLS policy.
-- Every data table from migration 002 onwards is scoped by household_id.

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.households (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  owner_user_id text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id text not null references public.households(id) on delete cascade,
  user_id text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members(user_id);

create table public.household_invites (
  code text primary key,
  household_id text not null references public.households(id) on delete cascade,
  created_by_user_id text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  consumed_by_user_id text,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Helper function: is the caller a member of this household? ─────────────
-- Called from every downstream table's RLS policies.

create or replace function public.is_household_member(hid text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid
      and user_id = auth.jwt() ->> 'sub'
  )
$$;

-- ── Bootstrap function: creates a household on first sign-in ───────────────
-- Idempotent. Called from the web app's (app)/layout.tsx server component
-- on every authenticated pageview — safe because it early-returns when the
-- caller already has a membership.

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

  if hid is not null then
    return query select * from public.households where id = hid;
    return;
  end if;

  hid := gen_random_uuid()::text;
  insert into public.households (id, name, owner_user_id, timezone)
    values (
      hid,
      coalesce(nullif(email, ''), 'My') || ' Budget',
      uid,
      'UTC'
    );
  insert into public.household_members (household_id, user_id, role)
    values (hid, uid, 'owner');

  return query select * from public.households where id = hid;
end $$;

revoke all on function public.bootstrap_household() from public;
grant execute on function public.bootstrap_household() to authenticated;

-- ── Row-level security ──────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create policy "households_select_member" on public.households
  for select using (
    id in (
      select household_id from public.household_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "household_members_select_member" on public.household_members
  for select using (public.is_household_member(household_id));

create policy "household_invites_select_member" on public.household_invites
  for select using (public.is_household_member(household_id));

create policy "household_invites_insert_owner" on public.household_invites
  for insert with check (
    exists (
      select 1 from public.household_members
      where household_id = household_invites.household_id
        and user_id = auth.jwt() ->> 'sub'
        and role = 'owner'
    )
  );

-- Households insert/update/delete: server-only (via edge functions using service-role or SECURITY DEFINER
-- helpers like bootstrap_household). No client-facing insert/update/delete policies on households or
-- household_members — those flows go through dedicated RPCs later.
