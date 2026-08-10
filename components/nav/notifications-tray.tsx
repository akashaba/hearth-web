'use client'

import Link from 'next/link'
import { Bell, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  iconFor,
  toneFor,
  useMarkAllRead,
  useNotifications,
  type Notification,
} from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'

export function NotificationsTray() {
  const { items, unreadCount, isLoading } = useNotifications()
  const markRead = useMarkAllRead()

  const onOpen = (open: boolean) => {
    // Mark everything visible as read the moment the tray opens. Simple UX;
    // no per-row mark-read to fiddle with.
    if (open && unreadCount > 0) {
      markRead.mutate(items.filter((n) => !n.read_at).map((n) => n.id))
    }
  }

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-slate-950"
              aria-hidden
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Notifications
          </h3>
          {items.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'all read'}
            </span>
          )}
        </div>

        {isLoading && items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">All caught up</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              You&apos;ll see expense receipts, upcoming fixed bills, and budget alerts here.
            </p>
          </div>
        ) : (
          <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {items.map((n) => (
              <Row key={n.id} item={n} />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Row({ item: n }: { item: Notification }) {
  const tone = toneFor(n.kind)
  const Icon = iconFor(n.kind)
  const toneClass =
    tone === 'danger'
      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        : tone === 'info'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'

  const inner = (
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', toneClass)}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              'truncate text-sm',
              n.read_at
                ? 'font-normal text-slate-700 dark:text-slate-300'
                : 'font-semibold text-slate-900 dark:text-slate-100',
            )}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatRelative(n.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-snug text-slate-600 dark:text-slate-400">
          {n.body}
        </p>
      </div>
      {!n.read_at && (
        <span
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
          aria-label="Unread"
        />
      )}
    </div>
  )

  if (n.related_href) {
    return (
      <li>
        <Link href={n.related_href}>{inner}</Link>
      </li>
    )
  }
  return <li>{inner}</li>
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: false })
      .replace('less than a minute', 'now')
      .replace('about ', '')
      .replace(/ minutes?$/, 'm')
      .replace(/ hours?$/, 'h')
      .replace(/ days?$/, 'd')
      .replace(/ months?$/, 'mo')
  } catch {
    return ''
  }
}
