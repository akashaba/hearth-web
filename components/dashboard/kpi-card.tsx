'use client'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatMoney, formatPct } from '@/shared/format'

type Props = {
  label: string
  value: number
  /** Fraction: 0.12 = +12%. Null means "no comparison available". */
  deltaPct?: number | null
  /** Text next to the delta chip, e.g. "vs last month". */
  compareLabel?: string
  /** If the metric is inherently "less is better" (expenses), invert the delta color. */
  invertDeltaColor?: boolean
  className?: string
}

export function KpiCard({
  label,
  value,
  deltaPct,
  compareLabel = 'vs last month',
  invertDeltaColor = false,
  className,
}: Props) {
  const showDelta = deltaPct !== undefined && deltaPct !== null
  const isPositive = (deltaPct ?? 0) >= 0
  // "Good" = green: positive delta by default, negative delta when inverted (expenses down = good).
  const isGood = invertDeltaColor ? !isPositive : isPositive

  return (
    <Card className={cn('min-w-0 overflow-hidden border-slate-200 dark:border-slate-800', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div
          title={formatMoney(value)}
          className="mt-3 truncate text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl dark:text-slate-50"
        >
          {formatMoney(value)}
        </div>
        {showDelta ? (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums',
                isGood
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              ) : (
                <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
              )}
              {formatPct(Math.abs(deltaPct!), 1)}
            </span>
            <span className="text-muted-foreground">{compareLabel}</span>
          </div>
        ) : (
          <div className="mt-3 h-[22px]" /> // spacer so cards with/without delta line up
        )}
      </CardContent>
    </Card>
  )
}
