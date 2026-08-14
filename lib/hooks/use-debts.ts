'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { qk } from '@/lib/query/keys'
import { useAuthedQuery } from './use-authed-query'
import { useCurrentHousehold } from './use-current-household'
import { snapshot, type LoanSnapshot } from '@/shared/amortize'
import type { DebtInput, DebtType } from '@/shared/schemas/debt'

export type Debt = {
  id: string
  name: string
  debt_type: DebtType
  original_balance: number
  apr: number
  monthly_payment: number
  first_payment_date: string
  category_id: string | null
  fixed_deduction_id: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export type DebtWithSnapshot = Debt & { snapshot: LoanSnapshot }

export function useDebts(): { data: Debt[]; isLoading: boolean } {
  const supabase = useSupabase()
  const q = useAuthedQuery<Debt[]>({
    queryKey: qk.debts,
    queryFn: async () => {
      // Fetch ALL debts (active + archived) — the view splits them into
      // sections so users can find/reopen archived ones.
      const { data, error } = await supabase
        .from('debts')
        .select(
          'id, name, debt_type, original_balance, apr, monthly_payment, first_payment_date, category_id, fixed_deduction_id, notes, active, created_at',
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...(r as unknown as Debt),
        original_balance: Number((r as unknown as { original_balance: string | number }).original_balance),
        monthly_payment: Number((r as unknown as { monthly_payment: string | number }).monthly_payment),
        apr: Number((r as unknown as { apr: string | number }).apr),
      })) as Debt[]
    },
  })
  return { data: q.data ?? [], isLoading: q.isLoading }
}

/** Convenience: derive whether a debt should be treated as paid off. */
export function isPaidOff(d: DebtWithSnapshot): boolean {
  return !d.snapshot.neverPaysOff && d.snapshot.paymentsRemaining === 0
}

export function useDebtsWithSnapshots(): {
  data: DebtWithSnapshot[]
  isLoading: boolean
} {
  const { data: debts, isLoading } = useDebts()
  const data = useMemo<DebtWithSnapshot[]>(() => {
    const today = new Date()
    return debts.map((d) => ({
      ...d,
      snapshot: snapshot(
        {
          originalBalance: d.original_balance,
          apr: d.apr,
          monthlyPayment: d.monthly_payment,
          firstPaymentDate: d.first_payment_date,
        },
        today,
      ),
    }))
  }, [debts])
  return { data, isLoading }
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.debts })
}

export function useCreateDebt() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DebtInput) => {
      if (!household.data) throw new Error('household not ready')
      const { data, error } = await supabase
        .from('debts')
        .insert({ ...input, household_id: household.data.id })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateDebt() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<DebtInput>) => {
      const { data, error } = await supabase
        .from('debts')
        .update(patch)
        .eq('id', id)
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteDebt() {
  const supabase = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}
