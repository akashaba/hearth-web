'use client'

import Link from 'next/link'
import { Bell, CheckCircle2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSmartNotifications, type SmartNotification } from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'

/**
 * Bell icon + badge + popover tray. Items are computed live from existing
 * data (subscriptions, budgets, forecast) — no notifications table.
 */
export function NotificationsTray() {
  const { items, count } = useSmartNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={count > 0 ? `${count} notifications` : 'Notifications'}
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
          {count > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-slate-950"
              aria-hidden
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Notifications
          </h3>
          {count > 0 && (
            <span className="text-[11px] text-muted-foreground">{count} to review</span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">All clear</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              No subscriptions to audit, budgets on track, and your cashflow forecast looks fine.
            </p>
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {items.map((n) => (
              <Row key={n.id} item={n} />
            ))}
          </ul>
        )}

        <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Notifications are computed live from your data. They clear when you act on them.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Row({ item: n }: { item: SmartNotification }) {
  const toneClass =
    n.tone === 'danger'
      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
      : n.tone === 'warning'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  const Icon = n.icon
  return (
    <li>
      <Link
        href={n.href}
        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            toneClass,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {n.title}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-slate-600 dark:text-slate-400">
            {n.body}
          </p>
        </div>
      </Link>
    </li>
  )
}
