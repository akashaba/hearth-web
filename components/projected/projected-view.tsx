'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProjectedSchedule } from '@/lib/hooks/use-projected-schedule'
import { formatDate, formatMoney } from '@/shared/format'
import { cn } from '@/lib/utils'

export function ProjectedView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const proj = useProjectedSchedule(year, month)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Projected Schedule
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-computed from your biweekly income + enabled fixed deductions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-medium">{proj.monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!proj.hasSetup && !proj.isLoading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="font-medium text-amber-900 dark:text-amber-200">
            Nothing to project yet
          </div>
          <div className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
            Fill in <Link href="/setup" className="underline">Setup</Link> — biweekly income + at least one fixed deduction — and rows will appear here.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Projected income" value={proj.totals.income} tone="income" />
        <SummaryCard label="Projected fixed" value={proj.totals.fixed} tone="fixed" />
        <SummaryCard label="Net (income − fixed)" value={proj.totals.net} tone="net" />
      </div>

      <Card>
        <CardContent className="p-0">
          {proj.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : proj.rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No projected activity for {proj.monthLabel}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proj.rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'rounded-full font-normal',
                          r.type === 'Income'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
                        )}
                      >
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category ?? '—'}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        r.type === 'Income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {r.type === 'Income' ? '+' : '-'}
                      {formatMoney(r.amount).replace(/^-/, '')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'income' | 'fixed' | 'net'
}) {
  const color =
    tone === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'fixed'
        ? 'text-rose-600 dark:text-rose-400'
        : value >= 0
          ? 'text-slate-900 dark:text-slate-50'
          : 'text-rose-600 dark:text-rose-400'
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-6">
        <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          title={formatMoney(value)}
          className={cn('mt-3 truncate text-xl font-semibold tabular-nums sm:text-2xl', color)}
        >
          {formatMoney(value)}
        </div>
      </CardContent>
    </Card>
  )
}
