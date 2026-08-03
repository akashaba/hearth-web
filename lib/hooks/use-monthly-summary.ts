'use client'

import { useMemo } from 'react'
import { useTransactions } from './use-transactions'
import { useSetup } from './use-setup'

export type MonthlySummaryRow = {
  month: number
  monthLabel: string
  income: number
  fixed: number
  variable: number
  totalExpenses: number
  saved: number
  cumulativeSaved: number
  endBalance: number
  savingsRate: number | null // null when income = 0
}

export type MonthlySummary = {
  year: number
  rows: MonthlySummaryRow[]
  totals: {
    income: number
    fixed: number
    variable: number
    totalExpenses: number
    saved: number
  }
  startingBalance: number
  isLoading: boolean
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function useMonthlySummary(year: number): MonthlySummary {
  const { data: txs = [], isLoading: txsLoading } = useTransactions()
  const { data: setup = null, isLoading: setupLoading } = useSetup()

  const computed = useMemo(() => {
    const startingBalance = setup?.starting_balance ?? 0
    const rows: MonthlySummaryRow[] = MONTH_LABELS.map((label, i) => ({
      month: i + 1,
      monthLabel: label,
      income: 0,
      fixed: 0,
      variable: 0,
      totalExpenses: 0,
      saved: 0,
      cumulativeSaved: 0,
      endBalance: startingBalance,
      savingsRate: null,
    }))

    for (const t of txs) {
      const parts = t.date.split('-')
      const ty = Number(parts[0])
      const tm = Number(parts[1])
      if (ty !== year) continue
      const row = rows[tm - 1]
      if (!row) continue
      if (t.type === 'credit') {
        row.income += t.amount
      } else {
        row.totalExpenses += t.amount
        if (t.category?.group_type === 'fixed') row.fixed += t.amount
        else if (t.category?.group_type === 'variable') row.variable += t.amount
      }
    }

    let cum = 0
    for (const row of rows) {
      row.saved = row.income - row.totalExpenses
      cum += row.saved
      row.cumulativeSaved = cum
      row.endBalance = startingBalance + cum
      row.savingsRate = row.income > 0 ? row.saved / row.income : null
    }

    const totals = rows.reduce(
      (acc, r) => ({
        income: acc.income + r.income,
        fixed: acc.fixed + r.fixed,
        variable: acc.variable + r.variable,
        totalExpenses: acc.totalExpenses + r.totalExpenses,
        saved: acc.saved + r.saved,
      }),
      { income: 0, fixed: 0, variable: 0, totalExpenses: 0, saved: 0 },
    )

    return { year, rows, totals, startingBalance }
  }, [txs, setup, year])

  return { ...computed, isLoading: txsLoading || setupLoading }
}
