'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMonthlySummary } from '@/lib/hooks/use-monthly-summary'
import { formatMoney, formatPct } from '@/shared/format'
import { cn } from '@/lib/utils'

export function SummaryView() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const summary = useMonthlySummary(year)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Monthly Summary
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Year-at-a-glance based on your actual transactions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-sm font-medium tabular-nums">{year}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {summary.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Fixed</TableHead>
                  <TableHead className="text-right">Variable</TableHead>
                  <TableHead className="text-right">Total Exp.</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                  <TableHead className="text-right">End Balance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.rows.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell className="font-medium">{r.monthLabel}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(r.income)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.fixed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.variable)}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {formatMoney(r.totalExpenses)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        r.saved >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {formatMoney(r.saved)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.cumulativeSaved)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.endBalance)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.savingsRate === null ? '—' : formatPct(r.savingsRate)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold dark:bg-slate-900/60">
                  <TableCell>Year total</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(summary.totals.income)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(summary.totals.fixed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(summary.totals.variable)}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                    {formatMoney(summary.totals.totalExpenses)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      summary.totals.saved >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {formatMoney(summary.totals.saved)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(summary.totals.saved)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(summary.startingBalance + summary.totals.saved)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {summary.totals.income > 0
                      ? formatPct(summary.totals.saved / summary.totals.income)
                      : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
