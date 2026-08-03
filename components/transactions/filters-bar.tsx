'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/common/date-picker'
import { CategoryPicker } from '@/components/common/category-picker'
import { AccountPicker } from '@/components/common/account-picker'
import type { TxFilters } from '@/lib/query/keys'

type Props = {
  value: TxFilters
  onChange: (next: TxFilters) => void
}

export function FiltersBar({ value, onChange }: Props) {
  const hasAny =
    !!value.start || !!value.end || !!value.category_id || !!value.account_id || !!value.type

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[10rem] flex-1">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">From</div>
        <DatePicker
          value={value.start ?? null}
          onChange={(v) => onChange({ ...value, start: v })}
          placeholder="Any"
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">To</div>
        <DatePicker
          value={value.end ?? null}
          onChange={(v) => onChange({ ...value, end: v })}
          placeholder="Any"
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Category</div>
        <CategoryPicker
          value={value.category_id}
          onChange={(id) => onChange({ ...value, category_id: id })}
          placeholder="All"
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Account</div>
        <AccountPicker
          value={value.account_id}
          onChange={(id) => onChange({ ...value, account_id: id })}
          placeholder="All"
        />
      </div>
      <div className="min-w-[8rem]">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Type</div>
        <Select
          value={value.type ?? '__all__'}
          onValueChange={(v) =>
            onChange({ ...value, type: v === '__all__' ? undefined : (v as 'debit' | 'credit') })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="debit">Expense</SelectItem>
            <SelectItem value="credit">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasAny && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  )
}
