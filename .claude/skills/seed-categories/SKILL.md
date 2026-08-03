---
name: seed-categories
description: Seed the categories table with the exact list from the user's Excel workbook. Use once after the initial DB migration, or whenever the seed list drifts from the spec.
---

# seed-categories

The `categories` table is populated from the Excel `Categories` sheet. The full list — with group and default type — must match exactly, because Dashboard and Category Breakdown iterate this list in this order.

## Seed data

```
Salary            | income   | credit | Regular paycheck
Bonus             | income   | credit |
Interest Income   | income   | credit |
Refund            | income   | credit | Returns, reimbursements
Other Income      | income   | credit |
Rent / Mortgage   | fixed    | debit  |
Utilities         | fixed    | debit  | Electric, water, gas
Internet / Phone  | fixed    | debit  |
Health Insurance  | fixed    | debit  |
Car Insurance     | fixed    | debit  |
Subscriptions     | fixed    | debit  | Streaming, software, gym
Debt Payment      | fixed    | debit  | Loans, credit card min
Investment        | fixed    | debit  | Auto-transfer to brokerage / retirement
Savings Transfer  | fixed    | debit  | Auto-transfer to savings
Groceries         | variable | debit  |
Restaurants       | variable | debit  | Dining out, takeout
Coffee            | variable | debit  |
Transportation    | variable | debit  | Fuel, transit, rideshare
Car Maintenance   | variable | debit  | Repairs, oil change
Medical           | variable | debit  | Doctor, pharmacy, dental
Clothing          | variable | debit  |
Household         | variable | debit  | Supplies, furniture
Shopping          | variable | debit  | General shopping
Entertainment     | variable | debit  |
Gifts             | variable | debit  |
Donations         | variable | debit  | Money sent to others, charity
Travel            | variable | debit  |
Education         | variable | debit  |
Miscellaneous     | variable | debit  | Anything uncategorized
```

## Where to put it

`supabase/seed.sql` — idempotent:

```sql
insert into public.categories (name, group_type, default_type, notes) values
  ('Salary', 'income', 'credit', 'Regular paycheck'),
  -- ...one row per category above...
  ('Miscellaneous', 'variable', 'debit', 'Anything uncategorized')
on conflict (name) do update
  set group_type = excluded.group_type,
      default_type = excluded.default_type,
      notes = excluded.notes;
```

`supabase db reset` re-runs this automatically. `name` needs a unique constraint for the `on conflict` clause — add it in the categories migration if it isn't already there.

Also mirror the list as a TypeScript constant at `src/shared/categories.ts` so both apps can render the master list without a DB round-trip when needed. Keep the two in lockstep — if you add a row here, add it in the SQL seed too, and vice versa.

## Verify

```sql
select group_type, count(*) from public.categories group by group_type order by group_type;
-- expected: income=5, fixed=9, variable=15
```

## Never

- Do not seed via the app UI. The category list is a piece of the spec, not user data.
- Do not skip a category to "add later" — Dashboard iterates the full list, and a missing row shifts the whole grid.
