'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Landmark, MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DebtDialog } from './debt-dialog'
import {
  useDebtsWithSnapshots,
  useDeleteDebt,
  type Debt,
  type DebtWithSnapshot,
} from '@/lib/hooks/use-debts'
import { DEBT_TYPE_LABELS } from '@/shared/schemas/debt'
import { formatDate, formatMoney, formatPct } from '@/shared/format'
import { cn } from '@/lib/utils'

export function DebtsView() {
  const { data: rows, isLoading } = useDebtsWithSnapshots()
  const del = useDeleteDebt()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [deleting, setDeleting] = useState<Debt | null>(null)

  const totals = useMemo(() => {
    let owed = 0
    let interestRemaining = 0
    let monthlyPayment = 0
    let anyActive = false
    for (const d of rows) {
      if (d.snapshot.neverPaysOff) {
        owed += d.original_balance
        continue
      }
      anyActive = true
      owed += d.snapshot.currentBalance
      interestRemaining += d.snapshot.interestRemaining
      monthlyPayment += d.monthly_payment
    }
    return { owed, interestRemaining, monthlyPayment, anyActive }
  }, [rows])

  // Highest APR = "focus extra payments here" (avalanche method).
  const priorityId = useMemo(() => {
    const withBalance = rows.filter((r) => r.snapshot.currentBalance > 0)
    if (withBalance.length < 2) return null
    return withBalance.reduce((best, r) => (r.apr > best.apr ? r : best), withBalance[0]).id
  }, [rows])

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (row: Debt) => {
    setEditing(row)
    setDialogOpen(true)
  }
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success('Debt removed')
      setDeleting(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Debts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track balances, interest, and payoff timelines. See how much you save by paying extra.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add debt
        </Button>
      </div>

      {/* Portfolio totals */}
      {totals.anyActive && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TotalCard label="Total owed" value={totals.owed} accent="rose" />
          <TotalCard label="Interest remaining" value={totals.interestRemaining} />
          <TotalCard label="Monthly payments" value={totals.monthlyPayment} accent="violet" />
        </div>
      )}

      {isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No debts tracked yet. Add one to see balance projections and payoff advice.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              isPriority={d.id === priorityId}
              onEdit={() => openEdit(d)}
              onDelete={() => setDeleting(d)}
            />
          ))}
        </div>
      )}

      <DebtDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this debt?</AlertDialogTitle>
            <AlertDialogDescription>
              The loan terms are deleted. Your payment transactions stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={confirmDelete}
              disabled={del.isPending}
            >
              {del.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DebtCard({
  debt: d,
  isPriority,
  onEdit,
  onDelete,
}: {
  debt: DebtWithSnapshot
  isPriority: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const s = d.snapshot
  const paid = Math.max(0, d.original_balance - s.currentBalance)
  const pct = d.original_balance > 0 ? paid / d.original_balance : 0
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
              <Landmark className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {d.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {DEBT_TYPE_LABELS[d.debt_type]} · {(d.apr * 100).toFixed(2)}% APR
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isPriority && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                Focus first
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                  onClick={onDelete}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {s.neverPaysOff ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" strokeWidth={2} />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Payment doesn&apos;t cover interest
              </p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                At {(d.apr * 100).toFixed(2)}% APR, interest alone is more than{' '}
                {formatMoney(d.monthly_payment)}. Increase the monthly payment.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Balance
                </div>
                <div
                  title={formatMoney(s.currentBalance)}
                  className="truncate text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl dark:text-slate-50"
                >
                  {formatMoney(s.currentBalance)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Paid off
                </div>
                <div className="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney(paid)}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, pct * 100)}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{formatPct(pct, 0)} paid down</span>
              <span>
                {s.paymentsRemaining} payment{s.paymentsRemaining === 1 ? '' : 's'} left
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Payoff date
                </div>
                <div className="mt-0.5 text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {s.payoffDate ? formatDate(s.payoffDate) : '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Interest to go
                </div>
                <div className="mt-0.5 text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {formatMoney(s.interestRemaining)}
                </div>
              </div>
            </div>

            <Link
              href={`/debts/${d.id}`}
              className={cn(
                'mt-4 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50',
              )}
            >
              <span>See payoff advisor</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TotalCard({
  label,
  value,
  accent = 'default',
}: {
  label: string
  value: number
  accent?: 'default' | 'rose' | 'violet'
}) {
  const valueClass =
    accent === 'rose'
      ? 'text-rose-600 dark:text-rose-400'
      : accent === 'violet'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-900 dark:text-slate-50'
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        title={formatMoney(value)}
        className={cn('mt-1.5 truncate text-xl font-semibold tabular-nums sm:text-2xl', valueClass)}
      >
        {formatMoney(value)}
      </div>
    </div>
  )
}
