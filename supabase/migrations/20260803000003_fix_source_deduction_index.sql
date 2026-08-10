-- Fix: neither date_trunc('month', date) nor to_char(date, 'YYYY-MM') work
-- in a Postgres index expression — both are marked STABLE (they internally
-- pass through timestamp, which is timezone-sensitive in general).
--
-- EXTRACT(field FROM date) IS IMMUTABLE (date has no timezone), so we use
-- (year, month) as two columns in the unique index. Same effective bucket
-- as truncating to first-of-month.
--
-- If earlier attempts left a partial index, drop first.

drop index if exists public.transactions_source_deduction_month_uidx;

create unique index transactions_source_deduction_month_uidx
  on public.transactions (
    source_deduction_id,
    (EXTRACT(YEAR FROM date)),
    (EXTRACT(MONTH FROM date))
  )
  where source_deduction_id is not null;
