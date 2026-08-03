'use client'

import { useMemo } from 'react'
import { useTransactions } from './use-transactions'
import { useSetup } from './use-setup'
import { useFixedDeductions } from './use-fixed-deductions'
import { computeCashflowForecast, type ForecastResult } from '@/shared/forecast'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function useCashflowForecast(days = 90, dangerThreshold = 500): {
  data: ForecastResult | null
  isLoading: boolean
} {
  const { data: txs = [], isLoading: txsLoading } = useTransactions()
  const { data: setup, isLoading: setupLoading } = useSetup()
  const { data: deductions = [], isLoading: dedLoading } = useFixedDeductions()

  const data = useMemo<ForecastResult | null>(() => {
    if (txsLoading || setupLoading || dedLoading) return null

    // Compute current balance: starting balance + all credits − all debits (since starting_balance_date).
    const startingBalance = setup?.starting_balance ?? 0
    const startingDate = setup?.starting_balance_date ?? null
    let currentBalance = startingBalance

    // Compute trailing-30-day variable spend simultaneously.
    const now = Date.now()
    const thirtyDaysAgo = new Date(now - 30 * MS_PER_DAY).toISOString().slice(0, 10)
    let variableSpendTrailing30 = 0

    for (const t of txs) {
      if (!startingDate || t.date >= startingDate) {
        currentBalance += t.type === 'credit' ? t.amount : -t.amount
      }
      if (
        t.type === 'debit' &&
        t.category?.group_type === 'variable' &&
        t.date >= thirtyDaysAgo
      ) {
        variableSpendTrailing30 += t.amount
      }
    }

    return computeCashflowForecast({
      currentBalance,
      days,
      dangerThreshold,
      biweeklyPayday:
        setup?.first_payday && setup.paycheck_amount > 0
          ? { firstPayday: setup.first_payday, amount: setup.paycheck_amount }
          : null,
      fixedDeductions: deductions.map((d) => ({
        day_of_month: d.day_of_month,
        amount: d.amount,
        enabled: d.enabled,
      })),
      variableSpendTrailing30,
    })
  }, [txs, setup, deductions, txsLoading, setupLoading, dedLoading, days, dangerThreshold])

  return { data, isLoading: txsLoading || setupLoading || dedLoading }
}
