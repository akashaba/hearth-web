// Amortization math for the Debt module. Pure functions — no I/O, no dates
// unless passed in. Used by web + mobile so keep this file in sync via
// /sync-shared-to-mobile.
//
// Loan model (standard fixed-payment amortization):
//   Each month:
//     interest  = balance * (apr / 12)
//     principal = payment - interest
//     balance  -= principal
//   Stops when balance <= 0. If payment <= first-month interest, the loan
//   never pays off — we return `neverPaysOff: true` and cap the schedule.

export type LoanTerms = {
  originalBalance: number
  apr: number // decimal fraction: 0.0499 = 4.99%
  monthlyPayment: number
  firstPaymentDate: string // YYYY-MM-DD
}

export type ExtraPayments = {
  /** Recurring extra amount added to every future monthly payment. */
  extraMonthly?: number
  /** One-off extra applied on the very next payment. */
  extraOnce?: number
}

export type ScheduleRow = {
  monthIndex: number // 0-based (0 = the first payment)
  date: string // YYYY-MM-DD
  payment: number // total paid this month (base + any extra)
  interest: number
  principal: number
  balance: number // balance AFTER this payment
}

export type AmortizeResult = {
  schedule: ScheduleRow[]
  monthsToPayoff: number // schedule.length; equal to schedule[last].monthIndex + 1
  payoffDate: string // date of the final payment; empty if neverPaysOff
  totalInterest: number // over the full life (from month 0 → payoff)
  totalPaid: number
  neverPaysOff: boolean
}

const MAX_MONTHS = 12 * 60 // 60-year safety cap for pathological inputs

/** Full amortization from month 0 (firstPaymentDate) to payoff. */
export function amortize(terms: LoanTerms, extra: ExtraPayments = {}): AmortizeResult {
  const { apr, monthlyPayment, originalBalance, firstPaymentDate } = terms
  const monthlyRate = apr / 12
  const extraMonthly = Math.max(0, extra.extraMonthly ?? 0)
  const extraOnce = Math.max(0, extra.extraOnce ?? 0)

  // Detect never-pays-off before entering the loop.
  const firstInterest = originalBalance * monthlyRate
  const firstPrincipal = monthlyPayment + extraMonthly + extraOnce - firstInterest
  if (firstPrincipal <= 0 && originalBalance > 0) {
    return {
      schedule: [],
      monthsToPayoff: 0,
      payoffDate: '',
      totalInterest: 0,
      totalPaid: 0,
      neverPaysOff: true,
    }
  }

  const schedule: ScheduleRow[] = []
  let balance = originalBalance
  let totalInterest = 0
  let totalPaid = 0

  for (let i = 0; i < MAX_MONTHS && balance > 0.005; i++) {
    const interest = round2(balance * monthlyRate)
    const oneShotExtra = i === 0 ? extraOnce : 0
    let payment = monthlyPayment + extraMonthly + oneShotExtra
    let principal = payment - interest

    // Final month: shrink payment to only what's needed.
    if (principal >= balance) {
      principal = balance
      payment = round2(principal + interest)
    }

    balance = round2(balance - principal)
    totalInterest = round2(totalInterest + interest)
    totalPaid = round2(totalPaid + payment)

    schedule.push({
      monthIndex: i,
      date: addMonths(firstPaymentDate, i),
      payment: round2(payment),
      interest,
      principal: round2(principal),
      balance,
    })
  }

  const last = schedule[schedule.length - 1]
  return {
    schedule,
    monthsToPayoff: schedule.length,
    payoffDate: last?.date ?? '',
    totalInterest,
    totalPaid,
    neverPaysOff: false,
  }
}

/**
 * Snapshot of a loan as of `today`: how much is left, how many payments made,
 * how much more you're on the hook for. Reads the amortization schedule
 * without hitting extras.
 */
export type LoanSnapshot = {
  currentBalance: number
  paymentsMade: number
  paymentsRemaining: number
  interestPaidToDate: number
  interestRemaining: number
  totalCostRemaining: number // sum of remaining scheduled payments
  payoffDate: string
  neverPaysOff: boolean
}

export function snapshot(terms: LoanTerms, today: Date = new Date()): LoanSnapshot {
  const result = amortize(terms)
  if (result.neverPaysOff) {
    return {
      currentBalance: terms.originalBalance,
      paymentsMade: 0,
      paymentsRemaining: Infinity,
      interestPaidToDate: 0,
      interestRemaining: Infinity,
      totalCostRemaining: Infinity,
      payoffDate: '',
      neverPaysOff: true,
    }
  }

  // paymentsMade = number of scheduled rows whose date <= today.
  const todayIso = toISODate(today)
  let paymentsMade = 0
  let interestPaidToDate = 0
  for (const row of result.schedule) {
    if (row.date <= todayIso) {
      paymentsMade++
      interestPaidToDate = round2(interestPaidToDate + row.interest)
    } else break
  }
  const remaining = result.schedule.slice(paymentsMade)
  const currentBalance = paymentsMade === 0 ? terms.originalBalance : result.schedule[paymentsMade - 1].balance
  const totalCostRemaining = round2(remaining.reduce((s, r) => s + r.payment, 0))
  const interestRemaining = round2(result.totalInterest - interestPaidToDate)

  return {
    currentBalance,
    paymentsMade,
    paymentsRemaining: remaining.length,
    interestPaidToDate,
    interestRemaining,
    totalCostRemaining,
    payoffDate: result.payoffDate,
    neverPaysOff: false,
  }
}

/**
 * Compare paying extra vs. minimum. Returns the delta so you can render
 * "Adding $50/month pays it off 14 months sooner and saves you $2,340
 * in interest".
 */
export type PayoffComparison = {
  baseline: LoanSnapshot
  withExtra: LoanSnapshot
  monthsSaved: number
  interestSaved: number
}

export function comparePayoff(
  terms: LoanTerms,
  extra: ExtraPayments,
  today: Date = new Date(),
): PayoffComparison {
  const baseline = snapshot(terms, today)
  if (baseline.neverPaysOff) {
    // With extra we might now pay off — compute honestly.
    const withResult = amortize(terms, extra)
    if (withResult.neverPaysOff) {
      return { baseline, withExtra: baseline, monthsSaved: 0, interestSaved: 0 }
    }
  }

  // "With extra" — re-amortize from today's remaining balance, not from
  // origination, so we're only projecting forward.
  const b = baseline
  if (b.paymentsRemaining === 0) {
    return { baseline, withExtra: baseline, monthsSaved: 0, interestSaved: 0 }
  }
  const remainingTerms: LoanTerms = {
    originalBalance: b.currentBalance,
    apr: terms.apr,
    monthlyPayment: terms.monthlyPayment,
    firstPaymentDate: toISODate(today),
  }
  const withResult = amortize(remainingTerms, extra)
  const withExtra: LoanSnapshot = withResult.neverPaysOff
    ? baseline
    : {
        currentBalance: b.currentBalance,
        paymentsMade: b.paymentsMade,
        paymentsRemaining: withResult.monthsToPayoff,
        interestPaidToDate: b.interestPaidToDate,
        interestRemaining: withResult.totalInterest,
        totalCostRemaining: withResult.totalPaid,
        payoffDate: withResult.payoffDate,
        neverPaysOff: false,
      }
  return {
    baseline,
    withExtra,
    monthsSaved: Math.max(0, b.paymentsRemaining - withExtra.paymentsRemaining),
    interestSaved: round2(Math.max(0, b.interestRemaining - withExtra.interestRemaining)),
  }
}

// ---- helpers ----

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addMonths(iso: string, monthsToAdd: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() + monthsToAdd)
  return toISODate(date)
}
