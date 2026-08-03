'use client'

import { useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { FixedDeductionDialog } from './fixed-deduction-dialog'
import {
  useFixedDeductions,
  useDeleteFixedDeduction,
  useUpdateFixedDeduction,
  type FixedDeduction,
} from '@/lib/hooks/use-fixed-deductions'
import { formatMoney } from '@/shared/format'

export function FixedDeductionsGrid() {
  const { data: rows = [], isLoading } = useFixedDeductions()
  const del = useDeleteFixedDeduction()
  const upd = useUpdateFixedDeduction()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FixedDeduction | null>(null)
  const [deleting, setDeleting] = useState<FixedDeduction | null>(null)

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (row: FixedDeduction) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const enabledTotal = rows.filter((r) => r.enabled).reduce((sum, r) => sum + r.amount, 0)

  const toggleEnabled = async (row: FixedDeduction) => {
    try {
      await upd.mutateAsync({ id: row.id, enabled: !row.enabled })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success('Deduction removed')
      setDeleting(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Fixed monthly deductions</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Recurring bills. Powers the Projected Schedule and cashflow forecast.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add deduction
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No fixed deductions yet. Add rent, subscriptions, and loan payments here.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[80px]">Day</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.notes && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{r.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{r.day_of_month}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category?.name ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(r.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          r.enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }
                      >
                        {r.enabled ? 'Enabled' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleEnabled(r)}>
                            {r.enabled ? 'Pause' : 'Enable'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                            onClick={() => setDeleting(r)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
              <span className="text-muted-foreground">Enabled monthly total</span>
              <span className="text-base font-semibold tabular-nums">{formatMoney(enabledTotal)}</span>
            </div>
          </>
        )}
      </CardContent>

      <FixedDeductionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this deduction?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the Projected Schedule immediately. Existing transactions
              you created for it stay in the ledger.
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
    </Card>
  )
}
