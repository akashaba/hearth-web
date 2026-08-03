// Investment math helpers for the /invest calculators.
// Pure functions, no I/O. Used by both web and mobile (mirror via
// /sync-shared-to-mobile). Standard finance formulas — nothing personalized.

export type CompoundInputs = {
  principal: number
  monthlyContribution: number
  annualReturnPct: number // 7 = 7%
  years: number
}

export type CompoundRow = {
  year: number
  balance: number
  totalContributed: number
  interestEarned: number
}

export type CompoundResult = {
  schedule: CompoundRow[]
  finalBalance: number
  totalContributed: number
  totalInterest: number
}

/**
 * Standard end-of-period compound growth with monthly contributions.
 * Rate is annualized: monthlyRate = annual/12, compounded monthly.
 * Each row shows year-end balance, not month-end.
 */
export function compoundGrowth(input: CompoundInputs): CompoundResult {
  const monthlyRate = input.annualReturnPct / 100 / 12
  const schedule: CompoundRow[] = []
  let balance = input.principal
  let totalContributed = input.principal

  for (let year = 1; year <= input.years; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + input.monthlyContribution
      totalContributed += input.monthlyContribution
    }
    schedule.push({
      year,
      balance: round2(balance),
      totalContributed: round2(totalContributed),
      interestEarned: round2(balance - totalContributed),
    })
  }

  return {
    schedule,
    finalBalance: round2(balance),
    totalContributed: round2(totalContributed),
    totalInterest: round2(balance - totalContributed),
  }
}

export type RetirementInputs = {
  currentAge: number
  retirementAge: number
  currentSavings: number
  monthlyContribution: number
  annualReturnPct: number
  /** Optional: assumed inflation-adjusted 4% safe withdrawal rate estimate. */
  safeWithdrawalRatePct?: number
}

export type RetirementResult = {
  yearsToRetirement: number
  projectedBalance: number
  totalContributed: number
  totalInterest: number
  /** If safeWithdrawalRatePct is provided, this is the annual pre-tax income the nest egg supports. */
  estimatedAnnualIncome: number | null
  schedule: CompoundRow[]
}

export function retirementProjection(input: RetirementInputs): RetirementResult {
  const years = Math.max(0, input.retirementAge - input.currentAge)
  const compound = compoundGrowth({
    principal: input.currentSavings,
    monthlyContribution: input.monthlyContribution,
    annualReturnPct: input.annualReturnPct,
    years,
  })
  const swr = input.safeWithdrawalRatePct
  return {
    yearsToRetirement: years,
    projectedBalance: compound.finalBalance,
    totalContributed: compound.totalContributed,
    totalInterest: compound.totalInterest,
    estimatedAnnualIncome: swr ? round2(compound.finalBalance * (swr / 100)) : null,
    schedule: compound.schedule,
  }
}

export type GoalInputs = {
  targetAmount: number
  years: number
  annualReturnPct: number
  startingAmount?: number // default 0
}

export type GoalResult = {
  requiredMonthlyContribution: number
  totalContributed: number
  totalInterest: number
  /** True if targetAmount is already met by startingAmount alone at the given return. */
  alreadyMet: boolean
}

/**
 * Solve for the monthly contribution needed to hit `targetAmount` in `years`
 * at `annualReturnPct`, given an optional lump sum today.
 *
 * Uses the closed-form annuity formula:
 *   FV = P*(1+r)^n + PMT * ((1+r)^n - 1) / r
 * Solving for PMT:
 *   PMT = (FV - P*(1+r)^n) * r / ((1+r)^n - 1)
 * where r = monthly rate, n = total months.
 */
export function requiredMonthlyForGoal(input: GoalInputs): GoalResult {
  const starting = input.startingAmount ?? 0
  const r = input.annualReturnPct / 100 / 12
  const n = input.years * 12

  // Growth of the starting lump sum with no further contributions.
  const startingGrown = r === 0 ? starting : starting * Math.pow(1 + r, n)

  if (startingGrown >= input.targetAmount) {
    return {
      requiredMonthlyContribution: 0,
      totalContributed: starting,
      totalInterest: round2(startingGrown - starting),
      alreadyMet: true,
    }
  }

  const remaining = input.targetAmount - startingGrown
  let pmt: number
  if (r === 0) {
    pmt = remaining / n
  } else {
    pmt = (remaining * r) / (Math.pow(1 + r, n) - 1)
  }

  const totalContributed = starting + pmt * n
  const totalInterest = input.targetAmount - totalContributed

  return {
    requiredMonthlyContribution: round2(Math.max(0, pmt)),
    totalContributed: round2(totalContributed),
    totalInterest: round2(totalInterest),
    alreadyMet: false,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
