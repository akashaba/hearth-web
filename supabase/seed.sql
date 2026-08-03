-- Seed the global categories table. Idempotent — `on conflict` updates existing rows.
-- Keep this list in lockstep with src/shared/categories.ts.

insert into public.categories (name, group_type, default_type, notes, sort_order) values
  ('Salary',           'income',   'credit', 'Regular paycheck',                          1),
  ('Bonus',            'income',   'credit', null,                                        2),
  ('Interest Income',  'income',   'credit', null,                                        3),
  ('Refund',           'income',   'credit', 'Returns, reimbursements',                   4),
  ('Other Income',     'income',   'credit', null,                                        5),
  ('Rent / Mortgage',  'fixed',    'debit',  null,                                       10),
  ('Utilities',        'fixed',    'debit',  'Electric, water, gas',                     11),
  ('Internet / Phone', 'fixed',    'debit',  null,                                       12),
  ('Health Insurance', 'fixed',    'debit',  null,                                       13),
  ('Car Insurance',    'fixed',    'debit',  null,                                       14),
  ('Subscriptions',    'fixed',    'debit',  'Streaming, software, gym',                 15),
  ('Debt Payment',     'fixed',    'debit',  'Loans, credit card min',                   16),
  ('Investment',       'fixed',    'debit',  'Auto-transfer to brokerage/retirement',    17),
  ('Savings Transfer', 'fixed',    'debit',  'Auto-transfer to savings',                 18),
  ('Groceries',        'variable', 'debit',  null,                                       20),
  ('Restaurants',      'variable', 'debit',  'Dining out, takeout',                      21),
  ('Coffee',           'variable', 'debit',  null,                                       22),
  ('Transportation',   'variable', 'debit',  'Fuel, transit, rideshare',                 23),
  ('Car Maintenance',  'variable', 'debit',  'Repairs, oil change',                      24),
  ('Medical',          'variable', 'debit',  'Doctor, pharmacy, dental',                 25),
  ('Clothing',         'variable', 'debit',  null,                                       26),
  ('Household',        'variable', 'debit',  'Supplies, furniture',                      27),
  ('Shopping',         'variable', 'debit',  'General shopping',                         28),
  ('Entertainment',    'variable', 'debit',  null,                                       29),
  ('Gifts',            'variable', 'debit',  null,                                       30),
  ('Donations',        'variable', 'debit',  'Money sent to others, charity',            31),
  ('Travel',           'variable', 'debit',  null,                                       32),
  ('Education',        'variable', 'debit',  null,                                       33),
  ('Miscellaneous',    'variable', 'debit',  'Anything uncategorized',                   99)
on conflict (name) do update set
  group_type   = excluded.group_type,
  default_type = excluded.default_type,
  notes        = excluded.notes,
  sort_order   = excluded.sort_order;
