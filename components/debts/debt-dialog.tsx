'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/common/currency-input'
import { CategoryPicker } from '@/components/common/category-picker'
import { DatePicker } from '@/components/common/date-picker'
import {
  debtSchema,
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  type DebtInput,
} from '@/shared/schemas/debt'
import { toISODate } from '@/shared/format'
import { useCreateDebt, useUpdateDebt, type Debt } from '@/lib/hooks/use-debts'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Debt | null
}

const emptyDefaults: DebtInput = {
  name: '',
  debt_type: 'credit_card',
  original_balance: 0,
  apr: 0.0499,
  monthly_payment: 0,
  first_payment_date: toISODate(new Date()),
  category_id: null,
  fixed_deduction_id: null,
  notes: null,
  active: true,
}

export function DebtDialog({ open, onOpenChange, editing }: Props) {
  const isEdit = !!editing
  const create = useCreateDebt()
  const update = useUpdateDebt()

  const form = useForm<DebtInput>({
    resolver: zodResolver(debtSchema),
    defaultValues: emptyDefaults,
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.reset({
        name: editing.name,
        debt_type: editing.debt_type,
        original_balance: editing.original_balance,
        apr: editing.apr,
        monthly_payment: editing.monthly_payment,
        first_payment_date: editing.first_payment_date,
        category_id: editing.category_id,
        fixed_deduction_id: editing.fixed_deduction_id,
        notes: editing.notes,
        active: editing.active,
      })
    } else {
      form.reset(emptyDefaults)
    }
  }, [editing, open, form])

  const onSubmit = async (values: DebtInput) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, ...values })
        toast.success('Debt updated')
      } else {
        await create.mutateAsync(values)
        toast.success('Debt added')
      }
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit debt' : 'New debt'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Chase card, Sallie Mae, Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="debt_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEBT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {DEBT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="original_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original balance</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
                    <FormDescription>The starting principal, not today&apos;s remaining.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthly_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly payment</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="apr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>APR (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={99}
                        // Store as fraction (0.0499). Display as percent (4.99).
                        value={Number.isFinite(field.value) ? (field.value * 100).toString() : ''}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value)
                          field.onChange(Number.isFinite(pct) ? pct / 100 : 0)
                        }}
                      />
                    </FormControl>
                    <FormDescription>Annual rate, e.g. 4.99 for 4.99% APR.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First payment date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={(v) => field.onChange(v ?? '')} />
                    </FormControl>
                    <FormDescription>
                      When you made (or will make) the very first payment.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <CategoryPicker
                      value={field.value ?? undefined}
                      onChange={(id) => field.onChange(id ?? null)}
                      placeholder="Tag payments to this category"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Add debt'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
