-- Mark-as-paid-off support for debts.
--
-- Nullable timestamp. When set, the debt is treated as paid off regardless
-- of what the amortization schedule says (used for early payoffs, refinances,
-- lump-sum settlements, etc.).
--
-- isPaidOff() in the client returns true if EITHER:
--   - the amortization schedule says paymentsRemaining === 0, OR
--   - paid_off_at IS NOT NULL

alter table public.debts
  add column if not exists paid_off_at timestamptz;
