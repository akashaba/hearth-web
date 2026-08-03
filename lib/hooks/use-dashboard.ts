'use client'

import { useMemo } from 'react'
import { useTransactions, type TransactionRow } from './use-transactions'
import { useSetup, type Setup } from './use-setup'
import type { CategoryGroup } from '@/shared/categories'
import type { MonthlyFlowPoint } from '@/components/dashboard/monthly-flow-chart'

export type DashboardKpis = {
  currentBalance: number
  startingBalance: number
  totalSaved: number
  thisMonthIncome: number
  thisMonthExpenses: number
  thisMonthFixed: number
  thisMonthVariable: number
  thisMonthSaved: number
  lastMonthIncome: number
  lastMonthExpenses: number
  lastMonthSaved: number
}

export type CategoryRollupRow = {
  category_id: string
  name: string
  group_type: CategoryGroup
  amount: number
  count: number
}

export type DashboardData = {
  kpis: DashboardKpis
  byCategoryThisMonth: CategoryRollupRow[]
  monthlyFlow: MonthlyFlowPoint[]
  hasAnyTransactions: boolean
  isLoading: boolean
  hasSetup: boolean
}

export function useDashboard(): DashboardData {
  const { data: txs = [], isLoading: txsLoading } = useTransactions()
  const { data: setup = null, isLoading: setupLoading } = useSetup()

  const computed = useMemo(() => compute(txs, setup), [txs, setup])

  return {
    ...computed,
    isLoading: txsLoading || setupLoading,
    hasAnyTransactions: txs.length > 0,
    hasSetup: !!setup,
  }
}

function compute(
  txs: TransactionRow[],
  setup: Setup | null,
): Omit<DashboardData, 'isLoading' | 'hasAnyTransactions' | 'hasSetup'> {
  const startingBalance = setup?.starting_balance ?? 0
  const startingDate = setup?.starting_balance_date ?? null

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const prev = new Date(thisYear, thisMonth - 2, 1)
  const lastYear = prev.getFullYear()
  const lastMonth = prev.getMonth() + 1

  let currentBalance = startingBalance
  let thisMonthIncome = 0
  let thisMonthExpenses = 0
  let thisMonthFixed = 0
  let thisMonthVariable = 0
  let lastMonthIncome = 0
  let lastMonthExpenses = 0

  const catMap = new Map<string, CategoryRollupRow>()

  // Prepare last-6-months buckets
  const flowBuckets: Array<{ y: number; m: number; label: string; income: number; expense: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - 1 - i, 1)
    flowBuckets.push({
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      income: 0,
      expense: 0,
    })
  }

  for (const t of txs) {
    if (!startingDate || t.date >= startingDate) {
      currentBalance += t.type === 'credit' ? t.amount : -t.amount
    }

    const parts = t.date.split('-')
    const ty = Number(parts[0])
    const tm = Number(parts[1])

    // 6-month flow bucketing
    const bucket = flowBuckets.find((b) => b.y === ty && b.m === tm)
    if (bucket) {
      if (t.type === 'credit') bucket.income += t.amount
      else bucket.expense += t.amount
    }

    if (ty === thisYear && tm === thisMonth) {
      if (t.type === 'credit') {
        thisMonthIncome += t.amount
      } else {
        thisMonthExpenses += t.amount
        if (t.category?.group_type === 'fixed') thisMonthFixed += t.amount
        else if (t.category?.group_type === 'variable') thisMonthVariable += t.amount
      }
      if (t.category) {
        const key = t.category.id
        const cur = catMap.get(key) ?? {
          category_id: key,
          name: t.category.name,
          group_type: t.category.group_type,
          amount: 0,
          count: 0,
        }
        cur.amount += t.amount
        cur.count += 1
        catMap.set(key, cur)
      }
    } else if (ty === lastYear && tm === lastMonth) {
      if (t.type === 'credit') lastMonthIncome += t.amount
      else lastMonthExpenses += t.amount
    }
  }

  const thisMonthSaved = thisMonthIncome - thisMonthExpenses
  const lastMonthSaved = lastMonthIncome - lastMonthExpenses

  return {
    kpis: {
      currentBalance,
      startingBalance,
      totalSaved: currentBalance - startingBalance,
      thisMonthIncome,
      thisMonthExpenses,
      thisMonthFixed,
      thisMonthVariable,
      thisMonthSaved,
      lastMonthIncome,
      lastMonthExpenses,
      lastMonthSaved,
    },
    byCategoryThisMonth: Array.from(catMap.values()).sort((a, b) => b.amount - a.amount),
    monthlyFlow: flowBuckets.map((b) => ({ label: b.label, income: b.income, expense: b.expense })),
  }
}

export function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return null
  return (current - prev) / prev
}
