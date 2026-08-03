// 90-day cashflow projection. Used by web (Recharts line chart) and mobile
// (SVG line chart) on the Dashboard.
//
// Formula per day D in the forecast window:
//   projected_balance(D) =
//       current_balance
//     + sum(projected paychecks between today and D)   ← biweekly from Setup anchor
//     - sum(projected fixed deductions between today and D)  ← from enabled fixed_deductions
//     - avg_daily_variable_spend * days_elapsed
//
// avg_daily_variable_spend = trailing-30-day sum of variable-category
// transactions ÷ 30.

import { fixedDeductionDate } from './projections'

export type ForecastInputs = {
  currentBalance: number
  today?: Date
  days?: number // default 90
  dangerThreshold?: number // default 500
  biweeklyPayday?: {
    firstPayday: string // YYYY-MM-DD anchor
    amount: number
  } | null
  fixedDeductions: Array<{
    day_of_month: number
    amount: number
    enabled: boolean
  }>
  /** Trailing 30-day sum of variable-category debit transactions. */
  variableSpendTrailing30: number
}

export type ForecastPoint = {
  day: number // 0..days
  date: string // YYYY-MM-DD
  balance: number
}

export type ForecastResult = {
  points: ForecastPoint[]
  minBalance: number
  minBalanceDate: string
  /** Earliest date the projected balance dips below `dangerThreshold`, or null. */
  dangerCrossingDate: string | null
  /** Rate used for the projection (per day). */
  avgDailyVariable: number
  /** Balance at day `days`. */
  endBalance: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const BIWEEKLY_MS = 14 * MS_PER_DAY

export function computeCashflowForecast(input: ForecastInputs): ForecastResult {
  const today = stripTime(input.today ?? new Date())
  const days = input.days ?? 90
  const dangerThreshold = input.dangerThreshold ?? 500
  const avgDailyVariable = input.variableSpendTrailing30 / 30

  // Pre-compute event deltas per day-offset for O(days) rollup.
  const deltas = new Array<number>(days + 1).fill(0)

  // Biweekly paychecks — from the first payday closest to today, stepping forward.
  if (input.biweeklyPayday && input.biweeklyPayday.amount > 0) {
    const anchor = new Date(input.biweeklyPayday.firstPayday + 'T00:00:00Z').getTime()
    const stepsFromAnchor = Math.floor((today.getTime() - anchor) / BIWEEKLY_MS)
    let cursor = anchor + stepsFromAnchor * BIWEEKLY_MS
    if (cursor < today.getTime()) cursor += BIWEEKLY_MS
    const end = today.getTime() + days * MS_PER_DAY
    while (cursor <= end) {
      const offset = Math.round((cursor - today.getTime()) / MS_PER_DAY)
      if (offset >= 0 && offset <= days) deltas[offset] += input.biweeklyPayday.amount
      cursor += BIWEEKLY_MS
    }
  }

  // Fixed deductions — for each month the window spans, add a delta on the
  // computed firing date (clamped to month length).
  const months = distinctMonths(today, days)
  for (const d of input.fixedDeductions) {
    if (!d.enabled) continue
    for (const [year, month] of months) {
      const fireDate = fixedDeductionDate(d.day_of_month, year, month)
      if (fireDate.getTime() < today.getTime()) continue
      const offset = Math.round((fireDate.getTime() - today.getTime()) / MS_PER_DAY)
      if (offset >= 0 && offset <= days) deltas[offset] -= d.amount
    }
  }

  // Walk the days, running the balance.
  const points: ForecastPoint[] = []
  let balance = input.currentBalance
  let minBalance = balance
  let minBalanceDate = toISO(today)
  let dangerCrossingDate: string | null = null

  for (let day = 0; day <= days; day++) {
    balance += deltas[day]
    if (day > 0) balance -= avgDailyVariable
    const dateStr = toISO(new Date(today.getTime() + day * MS_PER_DAY))
    points.push({ day, date: dateStr, balance })
    if (balance < minBalance) {
      minBalance = balance
      minBalanceDate = dateStr
    }
    if (dangerCrossingDate === null && balance < dangerThreshold) {
      dangerCrossingDate = dateStr
    }
  }

  return {
    points,
    minBalance,
    minBalanceDate,
    dangerCrossingDate,
    avgDailyVariable,
    endBalance: points[points.length - 1].balance,
  }
}

function stripTime(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function toISO(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function distinctMonths(today: Date, days: number): Array<[number, number]> {
  const set = new Set<string>()
  for (let i = 0; i <= days; i++) {
    const d = new Date(today.getTime() + i * MS_PER_DAY)
    set.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`)
  }
  return Array.from(set).map((k) => k.split('-').map(Number) as [number, number])
}
