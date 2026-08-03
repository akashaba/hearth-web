'use client'

import { MoreHorizontal } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/components/common/category-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatMoney } from '@/shared/format'
import { cn } from '@/lib/utils'
import type { TransactionRow } from '@/lib/hooks/use-transactions'

type Props = {
  rows: TransactionRow[]
  isLoading: boolean
  onEdit: (row: TransactionRow) => void
  onDelete: (row: TransactionRow) => void
}

const GROUP_STYLES = {
  income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  fixed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  variable: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const

export function TransactionsTable({ rows, isLoading, onEdit, onDelete }: Props) {
  if (isLoading && rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Loading transactions…</div>
    )
  }
  if (!isLoading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">No transactions yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Add your first one with the button above.
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[40px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const group = r.category?.group_type ?? 'variable'
          const signed = r.type === 'debit' ? -r.amount : r.amount
          return (
            <TableRow key={r.id}>
              <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
              <TableCell className="font-medium">
                {r.description}
                {r.notes && (
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{r.notes}</div>
                )}
              </TableCell>
              <TableCell>
                {r.category ? (
                  <Badge
                    variant="secondary"
                    className={cn('gap-1.5 rounded-full font-normal', GROUP_STYLES[group])}
                  >
                    <CategoryIcon categoryName={r.category.name} size={12} strokeWidth={2} />
                    {r.category.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.account?.name ?? '—'}</TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold tabular-nums',
                  r.type === 'debit'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {formatMoney(signed)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(r)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                      onClick={() => onDelete(r)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
