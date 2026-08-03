'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { setupSchema, type SetupInput } from '@/shared/schemas/setup'
import { toISODate } from '@/shared/format'
import { useSetup, useUpsertSetup } from '@/lib/hooks/use-setup'

export function SetupForm() {
  const { data: setup } = useSetup()
  const upsert = useUpsertSetup()

  const form = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      starting_balance: 0,
      starting_balance_date: toISODate(new Date()),
      paycheck_amount: 0,
      paycheck_category_id: null,
      first_payday: null,
    },
  })

  useEffect(() => {
    if (!setup) return
    form.reset({
      starting_balance: setup.starting_balance,
      starting_balance_date: setup.starting_balance_date,
      paycheck_amount: setup.paycheck_amount,
      paycheck_category_id: setup.paycheck_category_id,
      first_payday: setup.first_payday,
    })
  }, [setup, form])

  const onSubmit = async (values: SetupInput) => {
    try {
      await upsert.mutateAsync(values)
      toast.success('Setup saved')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Starting balance & income</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="starting_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting cash balance</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
                    <FormDescription>What you had on hand before you started tracking.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="starting_balance_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>As of date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Transactions before this date are ignored for balance.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="paycheck_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biweekly paycheck</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
                    <FormDescription>Take-home per paycheck.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paycheck_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paycheck category</FormLabel>
                    <FormControl>
                      <CategoryPicker
                        value={field.value ?? undefined}
                        onChange={(id) => field.onChange(id)}
                        placeholder="Usually Salary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_payday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First payday</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? null} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Anchor for the biweekly projection.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : 'Save setup'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
