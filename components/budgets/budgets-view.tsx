'use client'

import { useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
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
import { BudgetDialog } from './budget-dialog'
import {
  useBudgetsWithProgress,
  useDeleteBudget,
  type BudgetWithProgress,
  type Budget,
} from '@/lib/hooks/use-budgets'
import { formatMoney, formatPct } from '@/shared/format'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<BudgetWithProgress['status'], { bar: string; chip: string; label: string }> = {
  ok: {
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    label: 'On track',
  },
  warning: {
    bar: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    label: 'Close to cap',
  },
  over: {
    bar: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    label: 'Over budget',
  },
}

export function BudgetsView() {
  const { data: rows, isLoading } = useBudgetsWithProgress()
  const del = useDeleteBudget()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (row: Budget) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success('Budget removed')
      setDeleting(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Budgets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a monthly cap on each category. Progress resets on the 1st.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add budget
        </Button>
      </div>

      {isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No budgets yet. Add one to start tracking a category against a monthly cap.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const style = STATUS_STYLES[r.status]
            const capped = Math.min(r.progressPct, 1)
            const remaining = r.remaining
            return (
              <Card key={r.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r.category?.name ?? 'Unknown category'}
                      </div>
                      <div
                        className={cn(
                          'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          style.chip,
                        )}
                      >
                        {style.label}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                          onClick={() => setDeleting(r)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                      {formatMoney(r.spentThisMonth)}
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      of {formatMoney(r.monthly_amount)}
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn('h-full rounded-full transition-all', style.bar)}
                      style={{ width: `${capped * 100}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>{formatPct(r.progressPct, 0)} used</span>
                    <span>
                      {remaining >= 0
                        ? `${formatMoney(remaining)} left`
                        : `${formatMoney(Math.abs(remaining))} over`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <BudgetDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Your transactions stay put — only the monthly cap goes away.
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
