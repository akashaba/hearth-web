'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CurrencyInput } from '@/components/common/currency-input'
import { CategoryPicker } from '@/components/common/category-picker'
import { AccountPicker } from '@/components/common/account-picker'
import { DatePicker } from '@/components/common/date-picker'
import {
  transactionInsertSchema,
  type TransactionInput,
} from '@/shared/schemas/transaction'
import { toISODate } from '@/shared/format'
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '@/lib/hooks/use-transaction-mutations'
import type { TransactionRow } from '@/lib/hooks/use-transactions'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: TransactionRow | null
  defaultType?: 'debit' | 'credit'
}

export function TransactionDialog({ open, onOpenChange, editing, defaultType = 'debit' }: Props) {
  const isEdit = !!editing
  const create = useCreateTransaction()
  const update = useUpdateTransaction()

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionInsertSchema),
    defaultValues: {
      date: toISODate(new Date()),
      description: '',
      category_id: '',
      account_id: '',
      amount: 0,
      type: defaultType,
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      form.reset({
        date: editing.date,
        description: editing.description,
        category_id: editing.category?.id ?? '',
        account_id: editing.account?.id ?? '',
        amount: editing.amount,
        type: editing.type,
        notes: editing.notes ?? '',
      })
    } else {
      form.reset({
        date: toISODate(new Date()),
        description: '',
        category_id: '',
        account_id: '',
        amount: 0,
        type: defaultType,
        notes: '',
      })
    }
  }, [editing, open, form, defaultType])

  const onSubmit = async (values: TransactionInput) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, ...values })
        toast.success('Transaction updated')
      } else {
        await create.mutateAsync(values)
        toast.success('Transaction added')
      }
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const type = form.watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details below.' : 'Fill in the details and save.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              value={type}
              onValueChange={(v) => form.setValue('type', v as 'debit' | 'credit', { shouldDirty: true })}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="debit">Expense</TabsTrigger>
                <TabsTrigger value="credit">Income</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
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
                      <CurrencyInput
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Whole Foods, Rent, Paycheck" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <CategoryPicker
                        value={field.value}
                        onChange={(id, cat) => {
                          field.onChange(id)
                          // Pre-fill type from the category's default, unless the user already
                          // toggled Expense/Income manually this session.
                          if (!form.formState.dirtyFields.type) {
                            form.setValue('type', cat.default_type)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <FormControl>
                      <AccountPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Anything to remember" {...field} value={field.value ?? ''} />
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
                    : 'Add transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
