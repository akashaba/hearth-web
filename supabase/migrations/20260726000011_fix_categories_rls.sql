-- Fix categories RLS to work with Clerk's standard session JWT.
--
-- The original policy used `auth.role() = 'authenticated'`. That check works when
-- Supabase's own auth issues the JWT (which sets a "role" claim), but Clerk's
-- standard session token — which is what the Third-Party Auth integration validates
-- — doesn't set a "role" claim, so auth.role() reads empty and the policy denies.
--
-- Categories are global reference data with no user info. Safe to allow every
-- verified caller to read them. Using auth.jwt() is not null works uniformly for
-- Clerk-issued and Supabase-issued tokens, and rejects anonymous callers.

drop policy if exists "categories_select_all_authenticated" on public.categories;

create policy "categories_select_when_signed_in" on public.categories
  for select using (auth.jwt() is not null);
