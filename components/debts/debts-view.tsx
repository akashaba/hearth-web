'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArchiveRestore,
  ArrowRight,
  Check,
  ChevronDown,
  Landmark,
  MoreHorizontal,
  Plus,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  isEarlyPayoff,
  isPaidOff,
  useDebtsWithSnapshots,
  useDeleteDebt,
  useMarkPaidOff,
  useUpdateDebt,
  type Debt,
  type DebtWithSnapshot,
} from '@/lib/hooks/use-debts'
import { DEBT_TYPE_LABELS } from '@/shared/schemas/debt'
import { formatDate, formatMoney, formatPct } from '@/shared/format'
import { cn } from '@/lib/utils'

export function DebtsView() {
  const { data: rows, isLoading } = useDebtsWithSnapshots()
  const del = useDeleteDebt()
  const update = useUpdateDebt()
  const markPaidOff = useMarkPaidOff()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [deleting, setDeleting] = useState<Debt | null>(null)
  const [payingOff, setPayingOff] = useState<DebtWithSnapshot | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)

  const { active, archived } = useMemo(() => {
    const active: DebtWithSnapshot[] = []
    const archived: DebtWithSnapshot[] = []
    for (const d of rows) (d.active ? active : archived).push(d)
    return { active, archived }
  }, [rows])

  // Portfolio totals only count active, still-owed debts.
  const totals = useMemo(() => {
    let owed = 0
    let interestRemaining = 0
    let monthlyPayment = 0
    let anyOutstanding = false
    for (const d of active) {
      if (isPaidOff(d)) continue
      if (d.snapshot.neverPaysOff) {
        owed += d.original_balance
        continue
      }
      anyOutstanding = true
      owed += d.snapshot.currentBalance
      interestRemaining += d.snapshot.interestRemaining
      monthlyPayment += d.monthly_payment
    }
    return { owed, interestRemaining, monthlyPayment, anyOutstanding }
  }, [active])

  // "Focus first" = highest APR AMONG debts that still have a balance.
  const priorityId = useMemo(() => {
    const outstanding = active.filter((r) => !isPaidOff(r) && r.snapshot.currentBalance > 0)
    if (outstanding.length < 2) return null
    return outstanding.reduce((best, r) => (r.apr > best.apr ? r : best), outstanding[0]).id
  }, [active])

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
  const archive = async (d: Debt) => {
    try {
      await update.mutateAsync({ id: d.id, active: false })
      toast.success(`${d.name} archived`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const reopen = async (d: Debt) => {
    try {
      await update.mutateAsync({ id: d.id, active: true })
      toast.success(`${d.name} reopened`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const confirmMarkPaidOff = async () => {
    if (!payingOff) return
    try {
      await markPaidOff.mutateAsync({ id: payingOff.id, paidOff: true })
      toast.success(`${payingOff.name} — paid off. Nice.`)
      setPayingOff(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const unmarkPaidOff = async (d: Debt) => {
    try {
      await markPaidOff.mutateAsync({ id: d.id, paidOff: false })
      toast.success(`${d.name} — no longer marked paid off`)
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

      {totals.anyOutstanding && (
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
        <>
          {/* Active debts */}
          {active.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {active.map((d) => (
                <DebtCard
                  key={d.id}
                  debt={d}
                  isPriority={d.id === priorityId}
                  onEdit={() => openEdit(d)}
                  onDelete={() => setDeleting(d)}
                  onArchive={() => archive(d)}
                  onMarkPaidOff={
                    !isPaidOff(d) && !d.snapshot.neverPaysOff ? () => setPayingOff(d) : undefined
                  }
                  onUnmarkPaidOff={isEarlyPayoff(d) ? () => unmarkPaidOff(d) : undefined}
                />
              ))}
            </div>
          )}

          {/* Archived section — collapsed by default */}
          {archived.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
              <button
                onClick={() => setArchivedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <ArchiveRestore className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Archived
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {archived.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-slate-500 transition-transform',
                    archivedOpen && 'rotate-180',
                  )}
                  strokeWidth={1.75}
                />
              </button>
              {archivedOpen && (
                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 p-4 md:grid-cols-2 dark:border-slate-800">
                  {archived.map((d) => (
                    <DebtCard
                      key={d.id}
                      debt={d}
                      isPriority={false}
                      onEdit={() => openEdit(d)}
                      onDelete={() => setDeleting(d)}
                      onReopen={() => reopen(d)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <DebtDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this debt permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              The loan terms are wiped. Your payment transactions stay intact.
              (Consider archiving instead — it hides the debt without losing the record.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={confirmDelete}
              disabled={del.isPending}
            >
              {del.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!payingOff} onOpenChange={(o) => !o && setPayingOff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {payingOff?.name} as paid off?</AlertDialogTitle>
            <AlertDialogDescription>
              {payingOff && (
                <>
                  The amortization projected{' '}
                  <strong>{formatMoney(payingOff.snapshot.currentBalance)}</strong> remaining across{' '}
                  <strong>
                    {payingOff.snapshot.paymentsRemaining} payment
                    {payingOff.snapshot.paymentsRemaining === 1 ? '' : 's'}
                  </strong>
                  . If you paid it all off (lump sum, refinance, settlement), mark it done —
                  the debt moves to the paid-off state and the projections stop. Your existing
                  transactions stay untouched.
                  <br />
                  <br />
                  <span className="text-xs text-muted-foreground">
                    If you also want the payoff to show up in your ledger, add a transaction for{' '}
                    {formatMoney(payingOff.snapshot.currentBalance)} separately on the Transactions
                    page.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={confirmMarkPaidOff}
              disabled={markPaidOff.isPending}
            >
              {markPaidOff.isPending ? 'Saving…' : 'Yes, paid off'}
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
  onArchive,
  onReopen,
  onMarkPaidOff,
  onUnmarkPaidOff,
}: {
  debt: DebtWithSnapshot
  isPriority: boolean
  onEdit: () => void
  onDelete: () => void
  onArchive?: () => void
  onReopen?: () => void
  onMarkPaidOff?: () => void
  onUnmarkPaidOff?: () => void
}) {
  const s = d.snapshot
  const paid = Math.max(0, d.original_balance - s.currentBalance)
  const pct = d.original_balance > 0 ? paid / d.original_balance : 0
  const paidOff = isPaidOff(d)
  const isArchived = !d.active

  return (
    <Card
      className={cn(
        paidOff && d.active
          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/20'
          : isArchived
            ? 'opacity-80'
            : '',
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                paidOff
                  ? 'bg-emerald-100 dark:bg-emerald-950/60'
                  : 'bg-rose-100 dark:bg-rose-950/40',
              )}
            >
              {paidOff ? (
                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              ) : (
                <Landmark className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {d.name}
                </div>
                {paidOff && d.active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} /> Paid off
                  </span>
                )}
                {isArchived && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Archived
                  </span>
                )}
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
                {onMarkPaidOff && (
                  <DropdownMenuItem onClick={onMarkPaidOff}>Mark as paid off</DropdownMenuItem>
                )}
                {onUnmarkPaidOff && (
                  <DropdownMenuItem onClick={onUnmarkPaidOff}>
                    Unmark paid off
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={onArchive}>
                    {paidOff ? 'Archive (hide from list)' : 'Archive'}
                  </DropdownMenuItem>
                )}
                {onReopen && (
                  <DropdownMenuItem onClick={onReopen}>Reopen</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                  onClick={onDelete}
                >
                  Delete permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {paidOff ? (
          <PaidOffBody debt={d} paid={paid} />
        ) : s.neverPaysOff ? (
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
          <ActiveBody debt={d} paid={paid} pct={pct} />
        )}
      </CardContent>
    </Card>
  )
}

function ActiveBody({
  debt: d,
  paid,
  pct,
}: {
  debt: DebtWithSnapshot
  paid: number
  pct: number
}) {
  const s = d.snapshot
  return (
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
        className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
      >
        <span>See payoff advisor</span>
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </>
  )
}

function PaidOffBody({ debt: d, paid }: { debt: DebtWithSnapshot; paid: number }) {
  const s = d.snapshot
  const early = isEarlyPayoff(d)
  const totalInterestPaid = paid > 0 ? s.interestPaidToDate : 0
  const remainingWhenPaidOff = early ? s.currentBalance : 0
  const interestSavedByEarly = early ? s.interestRemaining : 0

  return (
    <>
      <div className="mt-5 rounded-xl border border-emerald-200 bg-white/60 p-4 dark:border-emerald-900/40 dark:bg-slate-900/60">
        {early ? (
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Paid off early on{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {d.paid_off_at ? formatDate(d.paid_off_at, { long: true }) : 'unknown date'}
            </span>
            . You settled the remaining{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {formatMoney(remainingWhenPaidOff)}
            </span>{' '}
            balance ahead of schedule
            {interestSavedByEarly > 0 && (
              <>
                , saving{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatMoney(interestSavedByEarly)}
                </span>{' '}
                in future interest
              </>
            )}
            .
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            You paid off{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {formatMoney(d.original_balance)}
            </span>{' '}
            in principal over{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {s.paymentsMade} payment{s.paymentsMade === 1 ? '' : 's'}
            </span>
            {s.payoffDate ? (
              <>
                , finishing{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {formatDate(s.payoffDate, { long: true })}
                </span>
              </>
            ) : null}
            . Total interest paid:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {formatMoney(totalInterestPaid)}
            </span>
            .
          </p>
        )}
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/40">
        <div className="h-full w-full rounded-full bg-emerald-500" />
      </div>
      {d.active && (
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          Archive it to hide from the main list — everything stays on record and you can reopen
          any time.
        </p>
      )}
    </>
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
