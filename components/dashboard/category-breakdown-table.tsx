'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/shared/format'
import type { CategoryRollupRow } from '@/lib/hooks/use-dashboard'

type Props = {
  rows: CategoryRollupRow[]
  isLoading: boolean
}

const GROUP_STYLES = {
  income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  fixed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  variable: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const

const GROUP_LABELS = {
  income: 'Income',
  fixed: 'Fixed',
  variable: 'Variable',
} as const

export function CategoryBreakdownTable({ rows, isLoading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">This month by category</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet this month. Add one with the buttons above.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((r) => (
              <div key={r.category_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={cn('rounded-full font-normal', GROUP_STYLES[r.group_type])}
                  >
                    {GROUP_LABELS[r.group_type]}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {r.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.count} transaction{r.count === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    r.group_type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-900 dark:text-slate-100',
                  )}
                >
                  {formatMoney(r.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
