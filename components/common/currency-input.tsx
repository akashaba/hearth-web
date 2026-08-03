'use client'

import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  value: number | null | undefined
  onChange: (value: number | null) => void
  className?: string
  placeholder?: string
  id?: string
  disabled?: boolean
  onBlur?: () => void
}

/**
 * Money input. Stores a `number` externally; displays a formatted string internally
 * so users can type without wrestling with locale separators. Empty string ↔ null.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(function CurrencyInput(
  { value, onChange, className, placeholder = '0.00', id, disabled, onBlur },
  ref,
) {
  const [text, setText] = useState<string>(value == null ? '' : String(value))

  useEffect(() => {
    // Keep local text in sync when the outer value changes (e.g. edit mode load).
    setText(value == null ? '' : String(value))
  }, [value])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        ref={ref}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '')
          setText(raw)
          if (raw === '' || raw === '.') {
            onChange(null)
            return
          }
          const n = Number(raw)
          if (Number.isFinite(n)) onChange(n)
        }}
        onBlur={onBlur}
        className={cn('pl-7 tabular-nums', className)}
      />
    </div>
  )
})
