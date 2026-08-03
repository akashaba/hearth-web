'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BookOpen,
  Calculator,
  Info,
  Landmark,
  LineChart,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatMoney } from '@/shared/format'
import {
  compoundGrowth,
  requiredMonthlyForGoal,
  retirementProjection,
} from '@/shared/investment'
import { cn } from '@/lib/utils'

export function InvestView() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Investments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Run the numbers on compound growth, retirement, and specific goals — plus a
          plain-English overview of how the pieces fit together.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
          <Info className="h-4 w-4 text-amber-700 dark:text-amber-400" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Educational only — not investment advice
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            These calculators are pure math on inputs you provide. Nothing here recommends
            specific investments, allocations, or products. Consult a licensed advisor for
            allocation, tax, or product decisions.
          </p>
        </div>
      </div>

      <Tabs defaultValue="compound">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="compound" className="gap-1.5">
            <Calculator className="h-3.5 w-3.5" strokeWidth={2} /> Compound growth
          </TabsTrigger>
          <TabsTrigger value="retirement" className="gap-1.5">
            <LineChart className="h-3.5 w-3.5" strokeWidth={2} /> Retirement
          </TabsTrigger>
          <TabsTrigger value="goal" className="gap-1.5">
            <Target className="h-3.5 w-3.5" strokeWidth={2} /> Goal solver
          </TabsTrigger>
          <TabsTrigger value="learn" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" strokeWidth={2} /> Learn
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compound" className="mt-4">
          <CompoundCalculator />
        </TabsContent>
        <TabsContent value="retirement" className="mt-4">
          <RetirementCalculator />
        </TabsContent>
        <TabsContent value="goal" className="mt-4">
          <GoalCalculator />
        </TabsContent>
        <TabsContent value="learn" className="mt-4">
          <LearnSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// COMPOUND GROWTH
// ────────────────────────────────────────────────────────────────────────
function CompoundCalculator() {
  const [principal, setPrincipal] = useState(5000)
  const [monthly, setMonthly] = useState(500)
  const [returnPct, setReturnPct] = useState(7)
  const [years, setYears] = useState(20)

  const result = useMemo(
    () =>
      compoundGrowth({
        principal,
        monthlyContribution: monthly,
        annualReturnPct: returnPct,
        years,
      }),
    [principal, monthly, returnPct, years],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField label="Starting amount" value={principal} onChange={setPrincipal} prefix="$" step={500} />
          <NumberField label="Monthly contribution" value={monthly} onChange={setMonthly} prefix="$" step={50} />
          <NumberField label="Annual return (%)" value={returnPct} onChange={setReturnPct} suffix="%" step={0.5} min={0} max={30} />
          <NumberField label="Years" value={years} onChange={setYears} step={1} min={1} max={60} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label={`Balance in ${years} years`} value={result.finalBalance} accent="violet" />
          <StatCard label="Total contributed" value={result.totalContributed} />
          <StatCard label="Interest earned" value={result.totalInterest} accent="emerald" />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Growth over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={result.schedule} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="conFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}y`} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => formatMoney(v, { compact: true })} width={72} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                  labelFormatter={(y: number) => `Year ${y}`}
                  formatter={(v: number, name) => [formatMoney(v), name === 'balance' ? 'Balance' : 'Total contributed']}
                />
                <Area type="monotone" dataKey="totalContributed" stroke="#94a3b8" strokeWidth={2} fill="url(#conFill)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="balance" stroke="#059669" strokeWidth={2} fill="url(#balFill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <Legend color="#059669" label="Balance" />
              <Legend color="#94a3b8" label="Contributions only" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// RETIREMENT
// ────────────────────────────────────────────────────────────────────────
function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(32)
  const [retirementAge, setRetirementAge] = useState(65)
  const [savings, setSavings] = useState(25000)
  const [monthly, setMonthly] = useState(750)
  const [returnPct, setReturnPct] = useState(7)
  const [swr, setSwr] = useState(4)

  const result = useMemo(
    () =>
      retirementProjection({
        currentAge,
        retirementAge,
        currentSavings: savings,
        monthlyContribution: monthly,
        annualReturnPct: returnPct,
        safeWithdrawalRatePct: swr,
      }),
    [currentAge, retirementAge, savings, monthly, returnPct, swr],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Current age" value={currentAge} onChange={setCurrentAge} step={1} min={18} max={90} />
            <NumberField label="Retirement age" value={retirementAge} onChange={setRetirementAge} step={1} min={40} max={90} />
          </div>
          <NumberField label="Current savings" value={savings} onChange={setSavings} prefix="$" step={1000} />
          <NumberField label="Monthly contribution" value={monthly} onChange={setMonthly} prefix="$" step={100} />
          <NumberField label="Annual return (%)" value={returnPct} onChange={setReturnPct} suffix="%" step={0.5} min={0} max={30} />
          <NumberField label="Safe withdrawal rate (%)" value={swr} onChange={setSwr} suffix="%" step={0.25} min={2} max={8} help="Classic '4% rule' — the % you'd withdraw yearly in retirement without draining the balance." />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Years to retirement" value={result.yearsToRetirement} isCurrency={false} suffix=" years" />
          <StatCard label={`Nest egg at ${retirementAge}`} value={result.projectedBalance} accent="violet" />
          <StatCard
            label={`~$${swr}% / yr income`}
            value={result.estimatedAnnualIncome ?? 0}
            accent="emerald"
          />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Path to retirement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={result.schedule} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => `${currentAge + v}`}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => formatMoney(v, { compact: true })} width={72} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                  labelFormatter={(y: number) => `Age ${currentAge + y}`}
                  formatter={(v: number) => [formatMoney(v), 'Projected balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#059669" strokeWidth={2} fill="url(#retFill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// GOAL SOLVER
// ────────────────────────────────────────────────────────────────────────
function GoalCalculator() {
  const [target, setTarget] = useState(100_000)
  const [years, setYears] = useState(10)
  const [returnPct, setReturnPct] = useState(7)
  const [starting, setStarting] = useState(5000)

  const result = useMemo(
    () =>
      requiredMonthlyForGoal({
        targetAmount: target,
        years,
        annualReturnPct: returnPct,
        startingAmount: starting,
      }),
    [target, years, returnPct, starting],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField label="Target amount" value={target} onChange={setTarget} prefix="$" step={5000} />
          <NumberField label="Years to reach it" value={years} onChange={setYears} step={1} min={1} max={60} />
          <NumberField label="Expected return (%)" value={returnPct} onChange={setReturnPct} suffix="%" step={0.5} min={0} max={30} />
          <NumberField label="Starting amount" value={starting} onChange={setStarting} prefix="$" step={500} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {result.alreadyMet ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                <ShieldCheck className="h-5 w-5 text-emerald-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  You&apos;re already there
                </p>
                <p className="text-sm text-muted-foreground">
                  Your starting amount grows to more than {formatMoney(target)} at {returnPct}% over{' '}
                  {years} years without any monthly contributions.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Save per month" value={result.requiredMonthlyContribution} accent="violet" />
              <StatCard label="Total you'll contribute" value={result.totalContributed} />
              <StatCard label="Interest earned" value={result.totalInterest} accent="emerald" />
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  To reach{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {formatMoney(target)}
                  </span>{' '}
                  in{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {years} year{years === 1 ? '' : 's'}
                  </span>{' '}
                  at an assumed{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {returnPct}%
                  </span>{' '}
                  annual return, you&apos;d need to contribute{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(result.requiredMonthlyContribution)} per month
                  </span>{' '}
                  on top of your{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {formatMoney(starting)}
                  </span>{' '}
                  starting amount.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Real markets don&apos;t return a smooth {returnPct}% every year — some years up,
                  some down. Treat the number as a planning target, not a guarantee.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// LEARN
// ────────────────────────────────────────────────────────────────────────

const LADDER = [
  {
    n: '01',
    title: 'Emergency fund — 3 to 6 months of essential expenses',
    body: 'Cash or high-yield savings. Not invested. Without this, one bad month forces you to sell investments at the worst time.',
  },
  {
    n: '02',
    title: 'Capture the full employer 401(k) match',
    body: 'If your employer matches (e.g. 100% up to 5% of salary), that\'s an instant return you cannot get anywhere else. Never leave it on the table.',
  },
  {
    n: '03',
    title: 'Pay off high-APR debt (~7%+ APR)',
    body: 'A credit card charging 22% APR beats any investment return you can reasonably expect. Kill it before adding new investments.',
  },
  {
    n: '04',
    title: 'Max tax-advantaged accounts (Roth IRA, HSA, then 401(k))',
    body: 'Roth IRA grows tax-free and can be withdrawn tax-free in retirement. HSA is triple-tax-advantaged if you have HDHP coverage. Then more into 401(k) up to the annual limit.',
  },
  {
    n: '05',
    title: 'Taxable brokerage for anything beyond',
    body: 'Once tax-advantaged buckets are maxed, invest the rest in a regular brokerage. More flexibility, but no tax break on contributions.',
  },
]

const VEHICLES = [
  { name: '401(k)', tax: 'Pre-tax now, taxed on withdrawal', limit: '$23,000/yr (2024)', notes: 'Employer-sponsored. Often has a match — take it.' },
  { name: 'Roth IRA', tax: 'After-tax now, tax-free withdrawals', limit: '$7,000/yr (2024)', notes: 'Best if you expect higher taxes in retirement. Income limits apply.' },
  { name: 'Traditional IRA', tax: 'Pre-tax now, taxed on withdrawal', limit: '$7,000/yr (2024)', notes: 'Deduction phases out at higher incomes if you have a 401(k).' },
  { name: 'HSA', tax: 'Triple-tax-advantaged', limit: '$4,150 self / $8,300 family (2024)', notes: 'Only available with an HDHP. Best investment account that exists.' },
  { name: 'Taxable brokerage', tax: 'Taxed on gains + dividends', limit: 'Unlimited', notes: 'No contribution cap, no early-withdrawal penalty, but no tax break.' },
]

const ASSETS = [
  { name: 'Stocks (equities)', risk: 'High', ret: '~10% long-term avg', note: 'Best long-term returns. Volatile year-to-year.' },
  { name: 'Bonds', risk: 'Low to medium', ret: '~4-6%', note: 'Stabilizes a portfolio. Lower long-term returns.' },
  { name: 'REITs', risk: 'Medium to high', ret: '~9%', note: 'Real-estate exposure without owning property.' },
  { name: 'Cash / HYSA', risk: 'Very low', ret: '~4-5% (as of 2024)', note: 'Instant liquidity. Loses to inflation long-term.' },
]

const CONCEPTS = [
  { name: 'Compound interest', body: 'Interest earned on interest already earned. The math is unremarkable early, then explodes late. $500/mo at 7% for 30 years → $610k. Only $180k of that is your contributions.' },
  { name: 'Dollar-cost averaging', body: 'Investing a fixed amount on a schedule regardless of market price. Removes emotion; you buy more shares when prices are low, fewer when high.' },
  { name: 'Time in market > timing the market', body: 'Trying to guess market tops and bottoms is a losing game. The 10 best days of a decade often account for most of the returns — and they cluster near the worst days.' },
  { name: 'Diversification', body: 'Spreading money across asset classes and geographies reduces the risk that any single loss wipes you out. A total-market index fund is diversification in one purchase.' },
]

function LearnSection() {
  return (
    <div className="space-y-6">
      {/* Ladder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
            The investment readiness ladder
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            The standard order of operations for putting money to work. Don&apos;t skip rungs.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {LADDER.map((step) => (
            <div key={step.n} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-3xl font-bold text-emerald-600/25 dark:text-emerald-400/25">
                {step.n}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {step.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {step.body}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vehicles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Landmark className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
            Account types (US)
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            The bucket matters as much as what&apos;s inside it. Different tax treatments = wildly
            different long-term outcomes.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-muted-foreground dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Vehicle</th>
                <th className="px-6 py-3 text-left font-semibold">Tax treatment</th>
                <th className="px-6 py-3 text-left font-semibold">2024 limit</th>
                <th className="px-6 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {VEHICLES.map((v) => (
                <tr key={v.name}>
                  <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{v.name}</td>
                  <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{v.tax}</td>
                  <td className="px-6 py-3 tabular-nums text-slate-600 dark:text-slate-400">{v.limit}</td>
                  <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Asset classes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Asset classes at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {ASSETS.map((a) => (
              <div key={a.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{a.name}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="uppercase tracking-wide">Risk:</span>{' '}
                    <span className="text-slate-800 dark:text-slate-200">{a.risk}</span>
                  </div>
                  <div>
                    <span className="uppercase tracking-wide">Historical:</span>{' '}
                    <span className="text-slate-800 dark:text-slate-200">{a.ret}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {a.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Historical returns are backward-looking averages. The future may differ. Not
            predictions.
          </p>
        </CardContent>
      </Card>

      {/* Concepts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Key concepts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {CONCEPTS.map((c) => (
            <div key={c.name}>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{c.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {c.body}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// SHARED
// ────────────────────────────────────────────────────────────────────────
function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
  max,
  help,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  step?: number
  min?: number
  max?: number
  help?: string
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <div className="mt-1 flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          id={id}
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            if (!Number.isFinite(n)) return
            let clamped = n
            if (min !== undefined) clamped = Math.max(min, clamped)
            if (max !== undefined) clamped = Math.min(max, clamped)
            onChange(clamped)
          }}
          className="h-9"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {help && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{help}</p>}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = 'default',
  isCurrency = true,
  suffix,
}: {
  label: string
  value: number
  accent?: 'default' | 'violet' | 'emerald'
  isCurrency?: boolean
  suffix?: string
}) {
  const valueClass =
    accent === 'violet'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-900 dark:text-slate-50'
  // Compact large numbers so an 8-digit balance doesn't overflow the card
  // on narrow screens. Show the full number in the title tooltip.
  const compactThreshold = 100_000
  const displayed = isCurrency
    ? Math.abs(value) >= compactThreshold
      ? formatMoney(value, { compact: true })
      : formatMoney(value)
    : `${value}${suffix ?? ''}`
  const fullText = isCurrency ? formatMoney(value) : displayed
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        title={fullText}
        className={cn(
          'mt-1.5 truncate text-xl font-semibold tabular-nums sm:text-2xl',
          valueClass,
        )}
      >
        {displayed}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      {label}
    </span>
  )
}
