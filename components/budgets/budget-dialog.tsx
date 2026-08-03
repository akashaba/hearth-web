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
import { budgetSchema, type BudgetInput } from '@/shared/schemas/budget-goal'
import { useCreateBudget, useUpdateBudget, type Budget } from '@/lib/hooks/use-budgets'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Budget | null
}

export function BudgetDialog({ open, onOpenChange, editing }: Props) {
  const isEdit = !!editing
  const create = useCreateBudget()
  const update = useUpdateBudget()

  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: '',
      monthly_amount: 0,
      alert_threshold_pct: 80,
      active: true,
    },
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.reset({
        category_id: editing.category_id,
        monthly_amount: editing.monthly_amount,
        alert_threshold_pct: editing.alert_threshold_pct,
        active: editing.active,
      })
    } else {
      form.reset({
        category_id: '',
        monthly_amount: 0,
        alert_threshold_pct: 80,
        active: true,
      })
    }
  }, [editing, open, form])

  const onSubmit = async (values: BudgetInput) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, ...values })
        toast.success('Budget updated')
      } else {
        await create.mutateAsync(values)
        toast.success('Budget added')
      }
      onOpenChange(false)
    } catch (e) {
      // Unique-violation on (household_id, category_id) means a budget already exists for that category.
      const msg = (e as Error).message
      toast.error(msg.includes('duplicate key') ? 'A budget for that category already exists' : msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit budget' : 'New budget'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategoryPicker
                      value={field.value}
                      onChange={(id) => field.onChange(id)}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormDescription>
                    Best for Variable categories. Fixed bills are already tracked in Setup.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly cap</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alert_threshold_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warn at (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Turns amber once you cross this percentage.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
