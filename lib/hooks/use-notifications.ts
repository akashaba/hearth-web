'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  Repeat,
} from 'lucide-react'
import { useSupabase } from '@/lib/supabase/browser'
import { useAuthedQuery } from './use-authed-query'

export type NotificationKind =
  | 'transaction'
  | 'auto_deduction'
  | 'upcoming_deduction'
  | 'budget_warning'
  | 'budget_over'

export type Notification = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  meta: Record<string, unknown>
  related_href: string | null
  created_at: string
  read_at: string | null // per-user read state (join)
}

const qkNotifications = ['notifications'] as const

export function useNotifications(): {
  items: Notification[]
  unreadCount: number
  isLoading: boolean
} {
  const supabase = useSupabase()
  const { user } = useUser()

  const q = useAuthedQuery<Notification[]>({
    queryKey: qkNotifications,
    queryFn: async () => {
      // Pull recent household notifications; also LEFT JOIN each user's own
      // read state (only rows where notification_reads.user_id = me).
      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, kind, title, body, meta, related_href, created_at, notification_reads(read_at)',
        )
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const uid = user?.id
      return (data ?? []).map((r) => {
        const reads = (r as { notification_reads?: Array<{ read_at: string; user_id?: string }> })
          .notification_reads
        // The RLS on notification_reads only returns the caller's own rows,
        // so any row present means "I read this". read_at = timestamp of that.
        const readAt = reads && reads.length > 0 ? reads[0].read_at : null
        return {
          ...(r as unknown as Notification),
          read_at: readAt,
        } as Notification
      })
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every 60s so new notifications appear without a refresh
  })

  const items = q.data ?? []
  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items])
  return { items, unreadCount, isLoading: q.isLoading }
}

export function useMarkAllRead() {
  const supabase = useSupabase()
  const { user } = useUser()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user?.id || ids.length === 0) return
      const rows = ids.map((notification_id) => ({
        notification_id,
        user_id: user.id,
      }))
      const { error } = await supabase
        .from('notification_reads')
        .upsert(rows, { onConflict: 'notification_id,user_id', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkNotifications }),
  })
}

// ─── UI-side tone/icon mapping ────────────────────────────────────────
export function iconFor(kind: NotificationKind): LucideIcon {
  switch (kind) {
    case 'auto_deduction':
      return Repeat
    case 'upcoming_deduction':
      return CalendarClock
    case 'budget_warning':
      return PiggyBank
    case 'budget_over':
      return AlertTriangle
    case 'transaction':
    default:
      return ArrowUpRight
  }
}

export function toneFor(kind: NotificationKind): 'info' | 'warning' | 'danger' | 'muted' {
  switch (kind) {
    case 'budget_over':
      return 'danger'
    case 'budget_warning':
      return 'warning'
    case 'upcoming_deduction':
      return 'warning'
    case 'auto_deduction':
      return 'info'
    case 'transaction':
    default:
      return 'muted'
  }
}
