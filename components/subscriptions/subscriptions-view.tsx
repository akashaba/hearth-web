'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Plus, Repeat, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FixedDeductionDialog } from '@/components/setup/fixed-deduction-dialog'
import {
  usePendingRecurringSuggestions,
  useUpdateSuggestionStatus,
  type RecurringSuggestion,
} from '@/lib/hooks/use-recurring-suggestions'
import { formatDate, formatMoney } from '@/shared/format'
import { cn } from '@/lib/utils'

export function SubscriptionsView() {
  const { data: suggestions, isLoading } = usePendingRecurringSuggestions()
  const updateStatus = useUpdateSuggestionStatus()
  const [accepting, setAccepting] = useState<RecurringSuggestion | null>(null)

  const totals = useMemo(() => {
    const monthly = suggestions.reduce((s, r) => s + r.avg_amount, 0)
    return { monthly, yearly: monthly * 12, count: suggestions.length }
  }, [suggestions])

  const dismiss = async (s: RecurringSuggestion) => {
    try {
      await updateStatus.mutateAsync({ id: s.id, status: 'dismissed' })
      toast.success('Dismissed')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Subscription audit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Charges that look recurring. Keep the ones you use, dismiss what you don&apos;t —
          each one is money leaving every month.
        </p>
      </div>

      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Total label="Detected" value={`${totals.count}`} isCurrency={false} />
          <Total label="Monthly total" value={formatMoney(totals.monthly)} accent="violet" />
          <Total label="Annual total" value={formatMoney(totals.yearly)} accent="rose" />
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <Repeat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
              Nothing to review right now
            </div>
            <p className="max-w-sm text-xs text-muted-foreground">
              The weekly sweep scans for repeat charges. If nothing shows up, either you have no
              recurring bills you haven&apos;t already logged as fixed deductions, or the sweep
              hasn&apos;t run yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <SubscriptionRow
              key={s.id}
              suggestion={s}
              onKeep={() => setAccepting(s)}
              onDismiss={() => dismiss(s)}
              busy={updateStatus.isPending}
            />
          ))}
        </div>
      )}

      <FixedDeductionDialog
        open={!!accepting}
        onOpenChange={(o) => !o && setAccepting(null)}
        initialValues={
          accepting
            ? {
                name: accepting.merchant,
                amount: accepting.avg_amount,
                day_of_month: accepting.avg_day_of_month,
                category_id: accepting.suggested_category_id ?? undefined,
                enabled: true,
              }
            : undefined
        }
        onCreated={async () => {
          if (!accepting) return
          try {
            await updateStatus.mutateAsync({ id: accepting.id, status: 'accepted' })
          } catch {
            // Deduction was created; swallow the follow-up status update failure.
          }
        }}
      />
    </div>
  )
}

function SubscriptionRow({
  suggestion: s,
  onKeep,
  onDismiss,
  busy,
}: {
  suggestion: RecurringSuggestion
  onKeep: () => void
  onDismiss: () => void
  busy: boolean
}) {
  const yearly = s.avg_amount * 12
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <Repeat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
              {s.merchant}
            </div>
            {s.suggested_category && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {s.suggested_category.name}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" strokeWidth={2} /> around day {s.avg_day_of_month}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" strokeWidth={2} /> seen {s.occurrence_count} times
            </span>
            <span className="text-slate-400">·</span>
            <span>
              first {formatDate(s.first_seen)}, last {formatDate(s.last_seen)}
            </span>
          </div>
        </div>

        <div className="flex-1 md:flex-none md:text-right">
          <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {formatMoney(s.avg_amount)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
          </div>
          <div className="text-[11px] tabular-nums text-muted-foreground">
            = {formatMoney(yearly)} / year
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss} disabled={busy}>
            <X className="mr-1 h-4 w-4" /> Not recurring
          </Button>
          <Button size="sm" onClick={onKeep} disabled={busy}>
            <Plus className="mr-1 h-4 w-4" /> Keep
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Total({
  label,
  value,
  accent = 'default',
  isCurrency = true,
}: {
  label: string
  value: string
  accent?: 'default' | 'violet' | 'rose'
  isCurrency?: boolean
}) {
  const valueClass =
    accent === 'violet'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'rose'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-900 dark:text-slate-50'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-1.5 text-2xl font-semibold', isCurrency && 'tabular-nums', valueClass)}>
        {value}
      </div>
    </div>
  )
}
