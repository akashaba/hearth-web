'use client'

import { useState } from 'react'
import { CalendarClock, MoreHorizontal, Plus, Target } from 'lucide-react'
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
import { GoalDialog } from './goal-dialog'
import {
  useSavingsGoalsWithProgress,
  useDeleteSavingsGoal,
  type SavingsGoal,
} from '@/lib/hooks/use-savings-goals'
import { formatDate, formatMoney, formatPct } from '@/shared/format'

export function GoalsView() {
  const { data: rows, isLoading } = useSavingsGoalsWithProgress()
  const del = useDeleteSavingsGoal()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null)

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (row: SavingsGoal) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success('Goal removed')
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
            Savings Goals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Name what you&apos;re saving for. Progress tracks automatically from your source category.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> New goal
        </Button>
      </div>

      {isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No goals yet. Add one to visualize progress toward what you&apos;re saving for.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((g) => {
            const capped = Math.min(g.progressPct, 1)
            const done = g.progressPct >= 1
            return (
              <Card key={g.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                        <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {g.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {g.source_category?.name ? `From ${g.source_category.name}` : 'No source category set'}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(g)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                          onClick={() => setDeleting(g)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                      {formatMoney(g.progress)}
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      of {formatMoney(g.target_amount)}
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        done ? 'bg-emerald-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${capped * 100}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>{formatPct(g.progressPct, 0)} funded</span>
                    <span>
                      {done ? 'Goal reached' : `${formatMoney(g.remaining)} to go`}
                    </span>
                  </div>

                  {g.target_date && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/60">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                      <span className="text-muted-foreground">Target</span>
                      <span className="ml-auto font-medium tabular-nums text-slate-900 dark:text-slate-100">
                        {formatDate(g.target_date)}
                      </span>
                      {g.monthlyPaceNeeded !== null && !done && (
                        <span className="ml-3 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {formatMoney(g.monthlyPaceNeeded)} / mo
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Your savings transactions stay put — only the goal tracker goes away.
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
