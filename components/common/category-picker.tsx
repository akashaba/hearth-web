'use client'

import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories, type Category } from '@/lib/hooks/use-categories'
import { CATEGORY_GROUPS, type CategoryGroup } from '@/shared/categories'
import { CategoryIcon } from './category-icon'

type Props = {
  value: string | undefined
  onChange: (value: string, category: Category) => void
  disabled?: boolean
  id?: string
  placeholder?: string
}

const GROUP_LABELS: Record<CategoryGroup, string> = {
  income: 'Income',
  fixed: 'Fixed',
  variable: 'Variable',
}

export function CategoryPicker({ value, onChange, disabled, id, placeholder = 'Select category' }: Props) {
  const { data: categories = [], isLoading } = useCategories()

  const grouped = useMemo(() => {
    const map = new Map<CategoryGroup, Category[]>()
    for (const g of CATEGORY_GROUPS) map.set(g, [])
    for (const c of categories) map.get(c.group_type)?.push(c)
    return map
  }, [categories])

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const cat = categories.find((c) => c.id === v)
        if (cat) onChange(v, cat)
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_GROUPS.map((g) => {
          const items = grouped.get(g) ?? []
          if (items.length === 0) return null
          return (
            <SelectGroup key={g}>
              <SelectLabel>{GROUP_LABELS[g]}</SelectLabel>
              {items.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon categoryName={c.name} size={14} strokeWidth={1.75} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
