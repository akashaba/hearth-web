// Biweekly + fixed-deduction date math. Shared verbatim between web and mobile.

const MS_PER_DAY = 24 * 60 * 60 * 1000
const BIWEEKLY_MS = 14 * MS_PER_DAY

/**
 * Returns every payday (date) that falls inside the given month, starting from
 * the anchor `firstPayday` and stepping in 14-day increments in either direction.
 */
export function paydaysInMonth(firstPayday: string, year: number, month: number): Date[] {
  const anchor = new Date(firstPayday + 'T00:00:00Z').getTime()
  const monthStart = Date.UTC(year, month - 1, 1)
  const monthEnd = Date.UTC(year, month, 0)

  // Jump straight to the first payday that could be inside the window.
  const stepsFromAnchor = Math.floor((monthStart - anchor) / BIWEEKLY_MS)
  let cursor = anchor + stepsFromAnchor * BIWEEKLY_MS
  if (cursor > monthStart) cursor -= BIWEEKLY_MS // guard rounding

  const out: Date[] = []
  while (cursor <= monthEnd) {
    if (cursor >= monthStart) out.push(new Date(cursor))
    cursor += BIWEEKLY_MS
  }
  return out
}

/**
 * Given a fixed deduction's `day_of_month`, returns the actual date it fires in the
 * given month. If `day_of_month` exceeds the days in the month (e.g. 31 in February),
 * fires on the last day of the month.
 */
export function fixedDeductionDate(dayOfMonth: number, year: number, month: number): Date {
  const dim = daysInMonth(year, month)
  const clamped = Math.min(Math.max(dayOfMonth, 1), dim)
  return new Date(Date.UTC(year, month - 1, clamped))
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}
