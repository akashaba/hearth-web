'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CategoryPicker } from '@/components/common/category-picker'
import { formatDate, formatMoney } from '@/shared/format'
import { cn } from '@/lib/utils'
import type { CategoryGroup } from '@/shared/categories'

export type ReviewRow = {
  key: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  category_id: string | undefined
  category_group: CategoryGroup | undefined
  isDuplicate: boolean
  selected: boolean
}

type Props = {
  rows: ReviewRow[]
  onToggle: (key: string, selected: boolean) => void
  onCategoryChange: (key: string, categoryId: string, group: CategoryGroup) => void
  onToggleAllNew: (selected: boolean) => void
}

export function ReviewTable({ rows, onToggle, onCategoryChange, onToggleAllNew }: Props) {
  const newRows = rows.filter((r) => !r.isDuplicate)
  const allNewSelected = newRows.length > 0 && newRows.every((r) => r.selected)
  const anyNewSelected = newRows.some((r) => r.selected)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[36px]">
            <input
              type="checkbox"
              checked={allNewSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allNewSelected && anyNewSelected
              }}
              onChange={(e) => onToggleAllNew(e.target.checked)}
              disabled={newRows.length === 0}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
          </TableHead>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="w-[220px]">Category</TableHead>
          <TableHead className="w-[130px] text-right">Amount</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key} className={cn(r.isDuplicate && 'opacity-60')}>
            <TableCell>
              <input
                type="checkbox"
                checked={r.selected}
                onChange={(e) => onToggle(r.key, e.target.checked)}
                disabled={r.isDuplicate}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
            <TableCell className="font-medium">{r.description}</TableCell>
            <TableCell>
              <CategoryPicker
                value={r.category_id}
                onChange={(id, cat) => onCategoryChange(r.key, id, cat.group_type)}
                disabled={r.isDuplicate}
              />
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-semibold tabular-nums',
                r.type === 'debit'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {r.type === 'debit' ? '-' : '+'}
              {formatMoney(r.amount).replace(/^-/, '')}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={
                  r.isDuplicate
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                }
              >
                {r.isDuplicate ? 'Exists' : 'New'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
