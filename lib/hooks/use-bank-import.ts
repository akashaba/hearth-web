'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase/browser'
import { useCurrentHousehold } from './use-current-household'
import type { BankParseResponse } from '@/shared/schemas/bank-import'
import type { TransactionInput } from '@/shared/schemas/transaction'

const DERIVED_KEYS = [
  ['transactions'],
  ['monthly-summary'],
  ['category-breakdown'],
  ['cashflow-forecast'],
] as const

/** Upload a PDF to the Gemini-backed parse route. */
export function useParseBankPdf() {
  return useMutation<BankParseResponse, Error, File>({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/bank-import/parse', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `parse failed (${res.status})`)
      }
      return (await res.json()) as BankParseResponse
    },
  })
}

/** Bulk-insert the rows the user picked. */
export function useBulkInsertTransactions() {
  const supabase = useSupabase()
  const household = useCurrentHousehold()
  const qc = useQueryClient()
  return useMutation<number, Error, TransactionInput[]>({
    mutationFn: async (rows: TransactionInput[]) => {
      if (!household.data) throw new Error('household not ready')
      if (rows.length === 0) return 0
      const payload = rows.map((r) => ({ ...r, household_id: household.data!.id }))
      const { error, count } = await supabase.from('transactions').insert(payload, { count: 'exact' })
      if (error) throw error
      return count ?? rows.length
    },
    onSuccess: () => {
      for (const key of DERIVED_KEYS) qc.invalidateQueries({ queryKey: key as unknown as readonly unknown[] })
    },
  })
}
