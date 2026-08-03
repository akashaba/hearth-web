---
name: send-push
description: Send an Expo Push notification from a Supabase Edge Function. Use for budget alerts, weekly digest delivery, or any server-triggered mobile notification. Handles Expo Push token lookup, batching, and receipt tracking.
---

# send-push

Push notifications for the mobile app are sent from **this** (web) repo's edge functions via the Expo Push service. The mobile repo owns the receive side — registering device tokens on install and handling incoming notifications (see mobile's `/push-notifications`).

## Prerequisite

Every mobile install stores its Expo Push token in `device_tokens` (`user_id, token, platform, last_seen_at`). Setup is documented in the mobile `/push-notifications` skill.

The token itself is the Expo-issued `ExpoPushToken[...]` string, not the raw APNs / FCM token.

## Sending a notification

```ts
// supabase/functions/_shared/push.ts
type PushMessage = {
  to: string           // ExpoPushToken[...]
  title: string
  body: string
  data?: Record<string, unknown>  // deep-link payload
  sound?: 'default'
  badge?: number
}

export async function sendPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return
  // Expo accepts up to 100 messages per request
  const chunks = chunk(messages, 100)
  for (const batch of chunks) {
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify(batch),
    })
    const result = await resp.json()
    // Log receipts for later status polling — Expo's `data[].id` is the receipt id
    await logPushReceipts(result.data ?? [])
  }
}
```

## Household-fanout pattern

For a household-scoped notification (e.g. budget over-limit), fan out to every member's every device token:

```ts
async function pushToHousehold(admin, householdId, title, body, data) {
  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token, user_id')
    .in('user_id',
      admin.from('household_members').select('user_id').eq('household_id', householdId)
    )
  await sendPush(tokens.map(t => ({ to: t.token, title, body, data, sound: 'default' })))
}
```

## Debouncing

For budget alerts: a category can cross 80% many times as the user adds transactions in a day. Debounce by writing to `push_dedupe(key, sent_at)` where `key = 'budget_80:<household_id>:<category_id>:<yyyymm>'`. Before sending, `on conflict do nothing insert` and only send if the insert succeeded (rows affected = 1).

## Handling invalid tokens

Expo returns `status: 'error', details.error: 'DeviceNotRegistered'` for tokens that were rotated or uninstalled. On receipt of this error, delete the token from `device_tokens` — otherwise the same dead token gets tried every subsequent send.

## Local dev

Expo Push works from any environment (including your local `supabase functions serve`) as long as the physical device has an Expo Push token. Simulators do NOT get push tokens — test on a real device.

## Never

- Ship the Expo access token to a client. It's a Supabase secret.
- Send more than 100 messages in one Expo request (they'll reject).
- Send a push without debounce when a webhook or user action could reasonably fire it many times in a row.
- Rely on push for anything critical (payment confirmation, security-sensitive). Push is best-effort; a user might have disabled it.
