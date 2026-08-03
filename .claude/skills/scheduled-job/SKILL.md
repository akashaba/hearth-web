---
name: scheduled-job
description: Create a scheduled job that runs periodically via Supabase pg_cron, typically to invoke an edge function. Use for the weekly AI digest, recurring-transaction detection sweep, or any periodic maintenance. Handles authentication of cron → edge function and per-household iteration patterns.
---

# scheduled-job

Supabase supports `pg_cron` for scheduling SQL to run inside the database at fixed intervals. Combined with `pg_net` for outgoing HTTP, `pg_cron` can invoke edge functions on a schedule.

Used by:
- **Weekly AI Digest** — Sundays at 08:00 per household timezone.
- **Recurring-transaction detection sweep** — weekly, once per household.

## One-time setup (already in an early migration)

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;
```

Store the Supabase URL and service-role key as GUCs so cron jobs can reach edge functions:

```sql
alter database postgres set app.settings.supabase_url = 'https://<project>.supabase.co';
alter database postgres set app.settings.service_role_key = '<service-role-key>';
```

`service_role_key` here lives inside the DB, not in a client. It's used only to sign the request to the internal edge-function endpoint.

## Scheduling a job

```sql
select cron.schedule(
  'weekly-digest',                                 -- job name (unique)
  '0 * * * *',                                     -- every hour (we filter by user tz inside the function)
  $$
    select net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('trigger', 'cron')
    );
  $$
);
```

Cron schedule strings are standard 5-field cron. Common patterns:

- `0 * * * *` — every hour on the hour
- `0 8 * * 0` — every Sunday at 08:00 UTC
- `*/30 * * * *` — every 30 minutes

## Per-household iteration inside the edge function

For jobs like the weekly digest, cron runs the function once and the function iterates households itself:

```ts
// Cron-invoked. Uses adminClient because it operates across every household.
const admin = adminClient()

// Only households whose local time is now "Sunday 08:00-08:59"
const nowUtc = new Date()
const { data: households } = await admin
  .from('households')
  .select('id, timezone, owner_user_id')

const targets = households.filter(h => {
  const local = toZonedTime(nowUtc, h.timezone ?? 'UTC')
  return local.getDay() === 0 && local.getHours() === 8
})

for (const h of targets) {
  try {
    await generateDigestForHousehold(admin, h)
  } catch (e) {
    console.error(`digest failed for ${h.id}`, e)  // do not throw — one household's failure must not block the rest
  }
}
```

## Idempotency

Cron will re-fire. Every job must be safely re-runnable:

- **Weekly digest** — check `digest_sends(household_id, sent_at)` for an entry in the last 6 days; skip if found.
- **Recurring-detection sweep** — `recurring_suggestions` uniqueness is enforced by `(household_id, merchant, avg_amount)` — inserts use `on conflict do nothing`.

Never rely on cron firing exactly once. Design the job to be safe under duplicate delivery.

## Cron-only auth

Edge functions invoked by cron pass the service-role key. To reject external calls to a cron-only function, guard the handler:

```ts
const authHeader = req.headers.get('Authorization') ?? ''
if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
  return json({ error: 'forbidden' }, 403)
}
```

Deploy those functions with `--no-verify-jwt` since they don't get a user JWT:

```bash
supabase functions deploy generate-weekly-digest --no-verify-jwt
```

## Listing and removing jobs

```sql
select * from cron.job;
select cron.unschedule('weekly-digest');
```

## Never

- Do not commit `service_role_key` to any migration file that ships. The `alter database ... set` calls above must be applied once, manually, per environment (dev + prod), never checked in.
- Do not throw from inside the per-household loop — one bad row can't fail the whole batch.
- Do not schedule sub-minute jobs. pg_cron's minimum is 1 minute; anything more frequent belongs in application code, not cron.
- Do not use cron to poll for user events (e.g. "did anyone add a transaction?"). Use DB triggers or client-driven flows instead.
