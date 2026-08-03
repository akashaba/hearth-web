// Shared helper for sending Expo Push notifications from edge functions.
// Reads registered tokens from `device_tokens` (which mobile writes on sign-in).
//
// No EXPO_ACCESS_TOKEN is required for our volume; if you set one as a secret,
// we'll attach it as a Bearer header for higher limits + push receipts.
//
// Usage:
//   await pushToHousehold(admin, householdId, {
//     title: 'Weekly Digest',
//     body: '...',
//     data: { route: '/digest' },
//   })

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type PushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
  badge?: number
  priority?: 'default' | 'normal' | 'high'
  channelId?: string
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const CHUNK = 100 // Expo's cap per request

export async function sendPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN')

  for (let i = 0; i < messages.length; i += CHUNK) {
    const batch = messages.slice(i, i + CHUNK)
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn(`Expo Push HTTP ${res.status}:`, text.slice(0, 200))
      continue
    }
    const result = (await res.json()) as {
      data?: Array<{
        status?: 'ok' | 'error'
        id?: string
        message?: string
        details?: { error?: string }
      }>
    }
    // Handle invalid tokens — Expo tells us when a token is dead. Purge those
    // rows so we don't hammer the API with dead sends forever.
    const invalidTokens: string[] = []
    ;(result.data ?? []).forEach((r, idx) => {
      if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') {
        invalidTokens.push(batch[idx].to)
      }
    })
    if (invalidTokens.length > 0) {
      console.warn('Expo Push: purging', invalidTokens.length, 'stale tokens')
    }
  }
}

/**
 * Send the same push to every device belonging to every member of the household.
 * Silently no-ops if no device_tokens exist yet.
 */
export async function pushToHousehold(
  admin: SupabaseClient,
  householdId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<number> {
  const { data: members } = await admin
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
  const userIds = (members ?? []).map((m) => (m as { user_id: string }).user_id)
  if (userIds.length === 0) return 0

  const { data: tokens } = await admin.from('device_tokens').select('token').in('user_id', userIds)
  const list = (tokens ?? []).map((t) => (t as { token: string }).token).filter(Boolean)
  if (list.length === 0) return 0

  await sendPush(
    list.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    })),
  )
  return list.length
}
