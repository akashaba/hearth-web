'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { CurrencyInput } from '@/components/common/currency-input'
import { CategoryPicker } from '@/components/common/category-picker'
import { DatePicker } from '@/components/common/date-picker'
import { savingsGoalSchema, type SavingsGoalInput } from '@/shared/schemas/budget-goal'
import { toISODate } from '@/shared/format'
import {
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  type SavingsGoal,
} from '@/lib/hooks/use-savings-goals'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: SavingsGoal | null
}

export function GoalDialog({ open, onOpenChange, editing }: Props) {
  const isEdit = !!editing
  const create = useCreateSavingsGoal()
  const update = useUpdateSavingsGoal()

  const form = useForm<SavingsGoalInput>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      name: '',
      target_amount: 0,
      target_date: null,
      source_category_id: null,
      starts_on: toISODate(new Date()),
    },
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.reset({
        name: editing.name,
        target_amount: editing.target_amount,
        target_date: editing.target_date,
        source_category_id: editing.source_category_id,
        starts_on: editing.starts_on,
      })
    } else {
      form.reset({
        name: '',
        target_amount: 0,
        target_date: null,
        source_category_id: null,
        starts_on: toISODate(new Date()),
      })
    }
  }, [editing, open, form])

  const onSubmit = async (values: SavingsGoalInput) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, ...values })
        toast.success('Goal updated')
      } else {
        await create.mutateAsync(values)
        toast.success('Goal created')
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
          <DialogTitle>{isEdit ? 'Edit goal' : 'New savings goal'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Emergency fund, MacBook, Vacation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target amount</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target date (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="No deadline" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="source_category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source category</FormLabel>
                  <FormControl>
                    <CategoryPicker
                      value={field.value ?? undefined}
                      onChange={(id) => field.onChange(id)}
                      placeholder="Usually Savings Transfer"
                    />
                  </FormControl>
                  <FormDescription>
                    Progress tracks debit transactions in this category since the start date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="starts_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>Transactions before this date don&apos;t count.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
