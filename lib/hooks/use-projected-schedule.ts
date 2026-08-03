'use client'

import { useMemo } from 'react'
import { useSetup } from './use-setup'
import { useFixedDeductions } from './use-fixed-deductions'
import { paydaysInMonth, fixedDeductionDate } from '@/shared/projections'
import { toISODate } from '@/shared/format'

export type ProjectedRow = {
  date: string
  type: 'Income' | 'Fixed'
  description: string
  amount: number
  category: string | null
  notes: string
}

export type ProjectedSchedule = {
  year: number
  month: number
  monthLabel: string
  rows: ProjectedRow[]
  totals: { income: number; fixed: number; net: number }
  isLoading: boolean
  hasSetup: boolean
}

export function useProjectedSchedule(year: number, month: number): ProjectedSchedule {
  const { data: setup = null, isLoading: setupLoading } = useSetup()
  const { data: deductions = [], isLoading: deductionsLoading } = useFixedDeductions()

  const computed = useMemo(() => {
    const rows: ProjectedRow[] = []
    let income = 0
    let fixed = 0

    // Paychecks (biweekly from anchor)
    if (setup?.first_payday && setup.paycheck_amount > 0) {
      const days = paydaysInMonth(setup.first_payday, year, month)
      days.forEach((d, i) => {
        rows.push({
          date: toISODate(d),
          type: 'Income',
          description: `Paycheck #${i + 1} (biweekly)`,
          amount: setup.paycheck_amount,
          category: 'Salary',
          notes: 'Projected from Setup',
        })
        income += setup.paycheck_amount
      })
    }

    // Fixed deductions (day-of-month, clamped to month length)
    for (const d of deductions) {
      if (!d.enabled) continue
      rows.push({
        date: toISODate(fixedDeductionDate(d.day_of_month, year, month)),
        type: 'Fixed',
        description: d.name,
        amount: d.amount,
        category: d.category?.name ?? null,
        notes: 'Projected from Setup',
      })
      fixed += d.amount
    }

    rows.sort((a, b) => a.date.localeCompare(b.date))

    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })

    return {
      year,
      month,
      monthLabel,
      rows,
      totals: { income, fixed, net: income - fixed },
    }
  }, [setup, deductions, year, month])

  return {
    ...computed,
    isLoading: setupLoading || deductionsLoading,
    hasSetup: !!setup?.first_payday || deductions.length > 0,
  }
}
