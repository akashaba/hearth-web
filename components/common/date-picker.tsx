'use client'

import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatDate, toISODate } from '@/shared/format'

type Props = {
  value: string | null | undefined // ISO date (YYYY-MM-DD)
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, disabled, id, placeholder = 'Pick a date', className }: Props) {
  const selected = value ? new Date(value + 'T00:00:00') : undefined
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(toISODate(d))
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
