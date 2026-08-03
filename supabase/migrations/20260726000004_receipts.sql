-- Receipts: OCR'd receipt uploads. Each row parents multiple transactions once submitted.

create type public.receipt_status as enum ('pending', 'parsed', 'submitted', 'failed');

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  image_path text not null,
  status public.receipt_status not null default 'pending',
  merchant text,
  receipt_date date,
  subtotal numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  ocr_raw jsonb,
  error text,
  created_by_user_id text,
  created_at timestamptz not null default now()
);

create index receipts_household_idx on public.receipts(household_id, created_at desc);

alter table public.receipts enable row level security;

create policy "receipts_select_member" on public.receipts
  for select using (public.is_household_member(household_id));
create policy "receipts_insert_member" on public.receipts
  for insert with check (public.is_household_member(household_id));
create policy "receipts_update_member" on public.receipts
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "receipts_delete_member" on public.receipts
  for delete using (public.is_household_member(household_id));

-- Now that receipts exists, finalize the FK from transactions.receipt_id → receipts.id.
alter table public.transactions
  add constraint transactions_receipt_fk
  foreign key (receipt_id) references public.receipts(id) on delete set null;

-- Private storage bucket for receipt images. Path convention: `<household_id>/<uuid>.jpg`.
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

-- RLS on storage.objects for the receipts bucket. Folder = household_id.
create policy "receipts_bucket_select_member" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and public.is_household_member(split_part(name, '/', 1))
  );

create policy "receipts_bucket_insert_member" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and public.is_household_member(split_part(name, '/', 1))
  );

create policy "receipts_bucket_delete_member" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and public.is_household_member(split_part(name, '/', 1))
  );
