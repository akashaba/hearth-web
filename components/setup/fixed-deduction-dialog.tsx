'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { CurrencyInput } from '@/components/common/currency-input'
import { CategoryPicker } from '@/components/common/category-picker'
import { fixedDeductionSchema, type FixedDeductionInput } from '@/shared/schemas/setup'
import {
  useCreateFixedDeduction,
  useUpdateFixedDeduction,
  type FixedDeduction,
} from '@/lib/hooks/use-fixed-deductions'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: FixedDeduction | null
  /** Pre-fill values on create (e.g. accepting a recurring suggestion). Ignored when `editing` is set. */
  initialValues?: Partial<FixedDeductionInput>
  /** Called after a successful create (not fired on edit). Receives the new deduction id. */
  onCreated?: (id: string) => void
}

export function FixedDeductionDialog({
  open,
  onOpenChange,
  editing,
  initialValues,
  onCreated,
}: Props) {
  const isEdit = !!editing
  const create = useCreateFixedDeduction()
  const update = useUpdateFixedDeduction()

  const form = useForm<FixedDeductionInput>({
    resolver: zodResolver(fixedDeductionSchema),
    defaultValues: {
      name: '',
      day_of_month: 1,
      amount: 0,
      category_id: '',
      notes: '',
      enabled: true,
    },
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.reset({
        name: editing.name,
        day_of_month: editing.day_of_month,
        amount: editing.amount,
        category_id: editing.category_id,
        notes: editing.notes ?? '',
        enabled: editing.enabled,
      })
    } else {
      form.reset({
        name: '',
        day_of_month: 1,
        amount: 0,
        category_id: '',
        notes: '',
        enabled: true,
        ...initialValues,
      })
    }
  }, [editing, open, form, initialValues])

  const onSubmit = async (values: FixedDeductionInput) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, ...values })
        toast.success('Deduction updated')
      } else {
        const created = await create.mutateAsync(values)
        toast.success('Deduction added')
        onCreated?.(created.id)
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
          <DialogTitle>{isEdit ? 'Edit fixed deduction' : 'New fixed deduction'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Rent, Netflix, Car Loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="day_of_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Fires on the last day if the month is shorter.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
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
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategoryPicker value={field.value} onChange={(id) => field.onChange(id)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Enabled (fires in Projected Schedule)</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add deduction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
