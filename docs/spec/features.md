# Feature Spec — derived from Personal_Finance_Tracker.xlsx

Source: the user's existing spreadsheet. This document is the contract; both the web and mobile apps must match it before adding new behavior.

**This file is duplicated in `web/docs/spec/features.md` and `mobile/docs/spec/features.md`. When you change one, change the other in the same session.**

## Household / Workspace model (baked in from day 1)

Every data row is owned by a **household**, not a user. A solo user has a household of size 1, auto-created on their first sign-in. Couples / families / roommates share a household.

**Schema:**

- `households` — `id, name, owner_user_id, created_at`
- `household_members` — `household_id, user_id, role` (`owner | member`), `joined_at`. Composite PK.

Every user-scoped table (transactions, setup, fixed_deductions, receipts, budgets, savings_goals, ...) has a `household_id text not null` column. RLS policy pattern:

```sql
using (
  household_id in (
    select household_id from household_members
    where user_id = auth.jwt() ->> 'sub'
  )
)
```

**Sign-in flow (Clerk webhook or on-first-query):**

1. On a user's first authenticated request, if they have no household membership, create a household `"<FirstName>'s Budget"` and add them as `owner`.
2. Every subsequent write uses the caller's current household_id.

**UI:** a household switcher in the sidebar (web) / settings (mobile) — hidden if the user only belongs to one household (the common case).

**Invitations (phase 1):** owner opens Settings → Household → Invite; a 6-character invite code is generated and stored in `household_invites` (`code, household_id, expires_at, created_by`). Invitee enters the code in their app under Settings → Join Household. On accept, a row is added to `household_members` and the code is consumed.

**Not in scope for phase 1:** granular permissions (per-category read/write), transfer of ownership, per-member spending caps, audit log. Two-role model (owner/member) is enough.

## Terminology

- **Debit** = money out (expense). **Credit** = money in (income/refund).
- **Group** = one of `income | fixed | variable`. Every category belongs to one group.
  - `income` — paychecks, refunds, interest
  - `fixed` — recurring monthly bills
  - `variable` — day-to-day spending
- **Saved this Month** = `sum(income this month) - sum(all expenses this month)`. Negative allowed.
- **End Balance (month M)** = `starting_balance + sum(all credits through end of M) - sum(all debits through end of M)`.

## Setup

Single per-user record.

| Field | Example | Notes |
| --- | --- | --- |
| starting_balance | 9828 | Cash on hand at `starting_balance_date` |
| starting_balance_date | 2026-07-20 | Any transaction before this date is ignored for balance |
| paycheck_amount | 3315 | Biweekly |
| paycheck_category_id | Salary | FK to categories |
| first_payday | 2026-07-22 | Anchor date; every 14 days from here in either direction |

Fixed deductions (many per user):

| Field | Example |
| --- | --- |
| name | Rent |
| day_of_month | 1 |
| amount | 1478 |
| category_id | Rent / Mortgage |
| notes | (optional) |
| enabled | true |

**Rule:** if `day_of_month > days_in_month(year, month)`, fire on the last day of the month.

## Transactions (ledger)

Columns match the Excel Transactions sheet exactly: `date, description, category, amount, type, account, notes`. Amount is always positive; sign comes from `type`.

## Bank Import

**Web only in phase 1.** Flow:

1. User pastes CSV rows into a grid.
2. UI parses columns: `Date | Description | Amount (signed) | Debit | Credit | Balance (opt) | Account | Category (opt)`.
3. For each row, derive `amount` and `type`:
   - If `Amount (signed)` is present: `type = amount < 0 ? debit : credit`, `amount = abs(amount)`.
   - Else if `Debit` present: `type = debit`, `amount = debit`.
   - Else if `Credit` present: `type = credit`, `amount = credit`.
4. User reviews, picks categories, confirms → bulk insert into `transactions`.
5. Original batch is kept in `bank_imports` for audit.

## Projected Schedule

Inputs: `year, month`. Output rows:

- **Paychecks** — starting from `first_payday`, every 14 days, keep those whose date falls in the target month. Emit one row each: `type=Income, description="Paycheck #N (biweekly)", amount=paycheck_amount, category=paycheck_category`.
- **Fixed deductions** — for each enabled deduction, compute the fire date using the day-of-month rule above. Emit `type=Fixed, description=name, amount, category`.

Totals row: `Income total`, `Fixed total`, `Net = Income - Fixed`.

## Monthly Summary

Inputs: `year`. Twelve rows (January..December) computed from actual transactions:

| Column | Formula |
| --- | --- |
| Income | `sum(amount) where type=credit and group=income` |
| Fixed Exp. | `sum(amount) where type=debit and group=fixed` |
| Variable Exp. | `sum(amount) where type=debit and group=variable` |
| Total Exp. | `Fixed + Variable` |
| Saved this Month | `Income - Total Exp.` |
| Cumulative Saved | running sum of Saved from Jan |
| End Balance | `starting_balance + Cumulative Saved` (approximation; the sheet uses this) |
| Savings Rate | `Saved / Income` if Income > 0 else null |

Year total row at bottom.

## Category Breakdown

Inputs: `year, month`. One row per category (all categories, even zero) with:

- `amount = sum(transactions.amount)` for that category in the month
- `count = number of transactions`
- `avg = amount / count` if count > 0 else null

## Dashboard

Top KPI grid (this month unless labeled):

- Current Balance = `starting_balance + all credits to date - all debits to date`
- This Month Income, This Month Expenses, Saved This Month
- Total Saved (all-time), Starting Balance, Fixed This Month, Variable This Month

Then the This Month Category Breakdown table (same shape as the Category Breakdown sheet but filtered to current month).

Quick actions: `+ Add Expense`, `+ Add Credit` open the Quick Entry modal.

## Quick Entry

A modal (or dedicated screen on mobile) with two tabs — Expense / Credit — that pre-fill `type=debit` or `type=credit`. Fields: `date, description, category, amount, account, notes`. Save inserts into `transactions` and closes.

Quick-date shortcuts (from the sheet): Today, Yesterday, 2 days ago, One week ago, Start of month, Last month same day.

## Categories (master list)

Editable list; each row has `name, group, default_type, notes`. When creating a transaction, the picker groups categories by their `group` field and pre-fills `type` from `default_type`. Seed the DB with the exact list from the Excel `Categories` sheet.

## Receipt Scan (mobile-only)

Not present in the original spreadsheet — added because the phone is the natural point of capture for paper receipts. Web has no equivalent (paper receipts arrive with you, not with your desk).

### Flow

1. From the Dashboard, user taps a **Scan Receipt** action. App requests camera permission on first use.
2. User takes a photo or picks from the library. The image is compressed to JPEG, max 1600px on the long edge, quality 0.7 (keeps the file <500KB while still being OCR-legible).
3. Image is uploaded to Supabase Storage bucket `receipts` under path `<user_id>/<uuid>.jpg`.
4. App inserts a `receipts` row with status `pending`, image path, and empty `ocr_raw`.
5. App invokes the `parse-receipt` Supabase Edge Function with `{ receipt_id }`. The function:
   - Fetches the image from Storage (using the caller's JWT, so RLS applies).
   - Calls Claude vision with a prompt containing the master category list and the instruction to return structured JSON: `{ merchant, receipt_date, subtotal, tax, total, items: [{ description, category, amount }] }`.
   - Constrains `category` to be one of the master category names — items the model can't classify go to `Miscellaneous`.
   - Writes the raw response back to `receipts.ocr_raw`, sets status to `parsed`, and returns the parsed payload.
6. App shows a **Review Items** screen:
   - One editable row per extracted item: description, category picker, amount.
   - Swipe left to remove a row. Bottom button to add a row (blank).
   - Header shows merchant + date (both editable), a picker for **Account**, and a **Notes** field applied to every generated transaction.
   - Discrepancy indicator: if `sum(items) != total`, show a small yellow "$X.XX off" chip so the user can fix it before submitting.
7. **Submit** → single transaction batch:
   - Insert N `transactions` rows, all with `type=debit`, the chosen account, the receipt's date, and `receipt_id` pointing at the parent.
   - Set `receipts.status = 'submitted'`.
8. On failure at step 5 (OCR error, timeout), the receipt stays at `pending` — the review screen still opens, empty, so the user can enter items manually. The image is preserved either way.

### Data model additions

**Table `receipts`** (per user, RLS by `user_id`):

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | text | Clerk sub |
| image_path | text | Storage path `<user_id>/<uuid>.jpg` |
| status | text | `pending | parsed | submitted | failed` |
| merchant | text null | Populated after parse |
| receipt_date | date null | Populated after parse |
| subtotal | numeric(12,2) null | |
| tax | numeric(12,2) null | |
| total | numeric(12,2) null | |
| ocr_raw | jsonb null | Full model response for audit |
| error | text null | If status=failed, the reason |
| created_at | timestamptz | |

**`transactions.receipt_id`** — new nullable FK to `receipts.id` with `on delete set null`. Enables "view original receipt" on any transaction that came from a scan.

**Storage bucket `receipts`** — RLS: only the owning user can read/write objects under `<user_id>/*`. Bucket is private (not public); access is through signed URLs or the authenticated client.

### Edge Function contract

`POST /functions/v1/parse-receipt`

Body: `{ receipt_id: string }`. Auth: user's Clerk `Bearer` token (same as regular Supabase requests).

Response: `200 { receipt: Receipt, items: Array<{ description, category, amount }> }` or `4xx { error: string }`.

The function must be invoked via the authenticated Supabase client so its `auth.jwt()` matches the caller and it can read only the caller's row via RLS.

### Costs / limits

- **Vision model: Gemini 2.5 Flash** — ~$0.001-0.003 per receipt (roughly 10x cheaper than Claude/GPT-4o). If accuracy proves insufficient in testing, swap to Claude 5 Sonnet or GPT-4.1 — the edge function abstracts the provider.
- Storage: negligible (~50-500KB per receipt).
- **Rate limit per household: 30 parses / day** — enforced in the edge function by counting today's `receipts` rows for that household.

### Not in scope for phase 1

- Multi-receipt batch (one photo at a time).
- Editing an already-submitted receipt's items (the transactions can still be edited individually).
- Re-parsing an existing image (delete and re-scan).
- Merchant-based default account inference.

## AI Financial Assistant

Chat screen on both web and mobile. User asks natural-language questions about their own finances; a Gemini-powered edge function answers using controlled tool access.

**Sample questions:**
- "How much did I spend on subscriptions in the last 6 months?"
- "What's my average grocery bill?"
- "Where can I cut $200/month?"
- "How much did Restaurants cost me last year vs this year?"

**Architecture:**

- Edge Function `ask` — accepts `{ conversation_id, message }`. Loads the conversation, appends the message, calls **Gemini 2.5 Pro** (Pro not Flash — reasoning quality matters here) with a tool schema exposing read-only functions: `query_transactions(filters)`, `monthly_summary(year)`, `category_breakdown(year, month)`, `list_budgets()`, `list_savings_goals()`, `list_fixed_deductions()`, `current_balance()`.
- The tool implementations run inside the edge function, using the caller's user-scoped Supabase client — so RLS caps what the model can read to the caller's household. **The model cannot write.** Phase 1 is read-only.
- Response is streamed back to the client and appended to the conversation.

**Data model:**

- `assistant_conversations` — `id, household_id, title, created_at, last_message_at`
- `assistant_messages` — `id, conversation_id, role` (`user | assistant | tool`), `content jsonb, created_at`

**UX:**

- Web: dedicated `/assistant` route with a conversation list on the left and the active chat on the right.
- Mobile: dedicated tab (or accessible from Dashboard "Ask" button, TBD in design). Chat bubble UI.
- New chat auto-titled from the first question (Gemini generates a short title as a follow-up call, or first-6-words fallback).

**Costs / limits:**

- Gemini 2.5 Pro: ~$0.02-0.10 per question depending on tool calls made.
- **Rate limit: 30 questions / day / household.**
- Phase 1 supports text only (no image attachments in chat).

## Cashflow Forecast

Extends Projected Schedule. A 90-day forward-looking balance line chart on the Dashboard and its own dedicated screen.

**Formula (per day D in the next 90 days):**

```
projected_balance(D) =
  current_balance
  + sum(projected_paychecks between today and D)     ← from Setup biweekly anchor
  - sum(projected_fixed_deductions between today and D)  ← from enabled fixed_deductions
  - avg_daily_variable_spend * days_elapsed
```

Where `avg_daily_variable_spend` = trailing-30-day sum of variable-category transactions ÷ 30.

**Visual:**

- Solid line = projected balance.
- Shaded band = ±20% variance on the variable-spend estimate.
- Red "danger zone" horizontal band below a configurable threshold (default $500). If the projection dips into it, show a warning chip with the earliest crossing date.

**Implementation:** SQL function `fn_cashflow_forecast(household_id, days)` returns a row per day.

## Smart Recurring Detection

Passive background scan for transactions that look like recurring bills the user hasn't captured in `fixed_deductions` yet.

**Detection algorithm (runs weekly via `pg_cron`):**

For each household:

1. Group transactions by normalized merchant name (lowercase, strip punctuation).
2. Within each group, find sequences of 3+ transactions where consecutive gaps are 28-32 days AND amounts are within ±10%.
3. If the merchant/amount doesn't already match an enabled `fixed_deductions` row, insert a `recurring_suggestions` row.

**Data model:**

- `recurring_suggestions` — `id, household_id, merchant, avg_amount, avg_day_of_month, suggested_category_id, occurrence_count, first_seen, last_seen, status` (`pending | accepted | dismissed`), `created_at`.

**UX:** a "💡 Suggested recurring bills" card at the top of the Setup screen and a subtle chip on the Transactions screen. One tap on a suggestion opens a pre-filled fixed-deduction form; "Dismiss" marks it and stops re-suggesting.

## Per-category Budgets

Monthly spend cap on a Variable category with progress tracking and (mobile) push alerts.

**Data model:**

- `budgets` — `id, household_id, category_id, monthly_amount numeric(12,2), alert_threshold_pct int default 80, active bool default true, created_at`. Unique on `(household_id, category_id)`.

Only Variable-group categories are eligible (Fixed have their own tracking via fixed_deductions).

**Display:**

- Dashboard: mini progress bar under each budgeted category in the current-month category breakdown table (`$187 / $300, 62%`; bar turns amber at 80%, red at 100%).
- Dedicated `/budgets` screen (web) / Budgets tab-adjacent screen (mobile): full list with edit / delete / add.

**Alerts (mobile only):**

- Push notification when a category first crosses `alert_threshold_pct` in a given month ("You've hit 80% of Restaurants for August.").
- Second notification at 100% ("Restaurants is over budget for August.").
- Debounced — one notification per threshold per category per month.

Web shows the same warnings in-app but no push (email digest is the web-side channel for time-sensitive alerts).

## Savings Goals

Named goals with a target amount + optional target date; progress tracked automatically.

**Data model:**

- `savings_goals` — `id, household_id, name, target_amount numeric(12,2), target_date date null, source_category_id` (default: the `Savings Transfer` category), `starts_on date`, `created_at`.

**Progress:**

- `progress = sum(transactions.amount) where category_id = source_category_id and household_id = goal.household_id and date >= goal.starts_on`.
- If `target_date` is set, compute `monthly_pace_needed = (target_amount - progress) / months_until_target` and display it prominently.

**UX:** a Goals screen (web + mobile) showing each goal as a card with a progress bar, current amount, target, target date, and pace-needed chip. Adding a goal is a simple form.

## Weekly AI Digest

Every Sunday morning, each household receives a personalized weekly summary generated by Gemini.

**Job:** Supabase `pg_cron` runs an edge function `generate-weekly-digest` at 08:00 in each user's local time (approximated by the household owner's timezone stored on `households.timezone`).

**Content template (filled by Gemini):**

- Total spent this week vs prior week (with % delta).
- Biggest category jump.
- Upcoming bills next week (from `fixed_deductions`).
- Any budget currently over 80%.
- One suggestion (e.g. "Consider setting a budget for Coffee — you spent $47 on it").

**Delivery:**

- Mobile: push notification with a summary + deep link into a "Weekly Digest" screen showing the full content.
- Web: optional email (opt-in in settings) using Resend or Supabase's built-in SMTP.

**Costs:** ~$0.01-0.03 per household per week (one Gemini 2.5 Flash call).

## Future updates (roadmap, not phase 1)

The following are agreed as future work and intentionally deferred so the phase-1 scope stays achievable:

- **Net Worth tracker** — `assets` + `liabilities` tables; time-series chart of net worth.
- **Voice entry** — "Hey Claude, log 12 dollars coffee" → parsed by edge function → transaction inserted.
- **Tax-deductible tagging** — boolean flag on transactions + year-end CSV export grouped by tag.

Do not implement these in phase 1. When any of them is picked up later, add a full spec section here first before writing code.
