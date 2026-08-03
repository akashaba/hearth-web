'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { FiltersBar } from './filters-bar'
import { TransactionsTable } from './transactions-table'
import { TransactionDialog } from './transaction-dialog'
import { ExportCsvButton } from './export-csv-button'
import { useTransactions, type TransactionRow } from '@/lib/hooks/use-transactions'
import { useDeleteTransaction } from '@/lib/hooks/use-transaction-mutations'
import type { TxFilters } from '@/lib/query/keys'

export function TransactionsView() {
  const [filters, setFilters] = useState<TxFilters>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionRow | null>(null)
  const [deleting, setDeleting] = useState<TransactionRow | null>(null)

  const { data: rows = [], isLoading } = useTransactions(filters)
  const del = useDeleteTransaction()

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (row: TransactionRow) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast.success('Transaction deleted')
      setDeleting(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every debit and credit — the source of truth for every number on the Dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton rows={rows} disabled={isLoading} />
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <FiltersBar value={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <TransactionsTable
            rows={rows}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={(row) => setDeleting(row)}
          />
        </CardContent>
      </Card>

      {!isLoading && rows.length > 0 && (
        <>
          <Separator />
          <div className="text-right text-xs text-muted-foreground">
            {rows.length} transaction{rows.length === 1 ? '' : 's'} shown (max 500)
          </div>
        </>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This can’t be undone. The Dashboard totals will update immediately.
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
    </div>
  )
}
