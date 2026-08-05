'use client'

import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, PiggyBank, Repeat, TrendingDown } from 'lucide-react'
import { usePendingRecurringSuggestions } from './use-recurring-suggestions'
import { useBudgetsWithProgress } from './use-budgets'
import { useCashflowForecast } from './use-cashflow-forecast'

/**
 * Smart-tray notifications derived from live data — no persistence.
 * Every item points at the page where the user can act on it. Count clears
 * naturally when the underlying condition resolves (dismiss the suggestion,
 * spend less this month, etc.).
 *
 * If we ever add a real notifications table, these can become the first
 * "generators" that populate it.
 */
export type SmartNotification = {
  id: string
  icon: LucideIcon
  tone: 'warning' | 'info' | 'danger'
  title: string
  body: string
  href: string
}

const DANGER_WINDOW_DAYS = 30

export function useSmartNotifications(): {
  items: SmartNotification[]
  count: number
  isLoading: boolean
} {
  const { data: suggestions, isLoading: sLoading } = usePendingRecurringSuggestions()
  const { data: budgets, isLoading: bLoading } = useBudgetsWithProgress()
  const { data: forecast, isLoading: fLoading } = useCashflowForecast(90, 500)

  const items = useMemo<SmartNotification[]>(() => {
    const out: SmartNotification[] = []

    // ─── Recurring suggestions ──────────────────────────
    if (suggestions.length > 0) {
      const yearly = suggestions.reduce((s, r) => s + r.avg_amount * 12, 0)
      out.push({
        id: 'recurring-suggestions',
        icon: Repeat,
        tone: 'info',
        title: `${suggestions.length} subscription${suggestions.length === 1 ? '' : 's'} to review`,
        body: `Detected recurring charges worth ~$${Math.round(yearly).toLocaleString()} / year. Keep or dismiss each.`,
        href: '/subscriptions',
      })
    }

    // ─── Budgets past their alert threshold ─────────────
    const overBudgets = budgets.filter((b) => b.status === 'over')
    const warnBudgets = budgets.filter((b) => b.status === 'warning')
    if (overBudgets.length > 0) {
      const names = overBudgets
        .map((b) => b.category?.name ?? 'Uncategorized')
        .slice(0, 3)
        .join(', ')
      out.push({
        id: 'budgets-over',
        icon: PiggyBank,
        tone: 'danger',
        title: `${overBudgets.length} budget${overBudgets.length === 1 ? '' : 's'} over cap`,
        body: overBudgets.length <= 3 ? names : `${names}, and ${overBudgets.length - 3} more`,
        href: '/budgets',
      })
    }
    if (warnBudgets.length > 0) {
      const names = warnBudgets
        .map((b) => b.category?.name ?? 'Uncategorized')
        .slice(0, 3)
        .join(', ')
      out.push({
        id: 'budgets-warn',
        icon: PiggyBank,
        tone: 'warning',
        title: `${warnBudgets.length} budget${warnBudgets.length === 1 ? '' : 's'} near the cap`,
        body: warnBudgets.length <= 3 ? names : `${names}, and ${warnBudgets.length - 3} more`,
        href: '/budgets',
      })
    }

    // ─── Cashflow forecast dips below danger threshold ──
    if (forecast?.dangerCrossingDate) {
      const daysAhead = daysBetween(new Date(), new Date(forecast.dangerCrossingDate))
      if (daysAhead >= 0 && daysAhead <= DANGER_WINDOW_DAYS) {
        out.push({
          id: 'cashflow-danger',
          icon: daysAhead <= 7 ? AlertTriangle : TrendingDown,
          tone: daysAhead <= 7 ? 'danger' : 'warning',
          title:
            daysAhead <= 0
              ? 'Balance is below your alert threshold'
              : `Balance dips low in ${daysAhead} day${daysAhead === 1 ? '' : 's'}`,
          body: `Projected to cross $500 on ${formatShort(forecast.dangerCrossingDate)}. Adjust spend or shift a bill to buy runway.`,
          href: '/forecast',
        })
      }
    }

    return out
  }, [suggestions, budgets, forecast])

  return {
    items,
    count: items.length,
    isLoading: sLoading || bLoading || fLoading,
  }
}

function daysBetween(a: Date, b: Date): number {
  const day = 86400_000
  return Math.floor((b.getTime() - a.getTime()) / day)
}

function formatShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
