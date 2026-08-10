-- Fix: `date_trunc('month', date)` is STABLE, not IMMUTABLE — Postgres
-- rejects it in a unique-index expression (error 42P17).
-- Swap to `to_char(date, 'YYYY-MM')` which IS IMMUTABLE for date input
-- and gives the same one-bucket-per-month behavior.
--
-- If migration 20260803000001 failed at the index creation step, the
-- earlier statements in that file (source_deduction_id column,
-- notifications table, trigger) may already exist. This migration only
-- (re)creates the index — safe to re-run.

drop index if exists public.transactions_source_deduction_month_uidx;

create unique index transactions_source_deduction_month_uidx
  on public.transactions (source_deduction_id, to_char(date, 'YYYY-MM'))
  where source_deduction_id is not null;
