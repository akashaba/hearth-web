'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, TrendingDown } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebts } from '@/lib/hooks/use-debts'
import {
  amortize,
  comparePayoff,
  snapshot,
  type LoanTerms,
} from '@/shared/amortize'
import { DEBT_TYPE_LABELS } from '@/shared/schemas/debt'
import { formatDate, formatMoney } from '@/shared/format'
import { cn } from '@/lib/utils'

const TIER_STEPS = [25, 50, 100, 200] as const

export function DebtDetailView({ id }: { id: string }) {
  const { data: debts, isLoading } = useDebts()
  const debt = debts.find((d) => d.id === id)

  const [extraMonthly, setExtraMonthly] = useState<number>(0)
  const [extraOnce, setExtraOnce] = useState<number>(0)

  const terms = useMemo<LoanTerms | null>(
    () =>
      debt
        ? {
            originalBalance: debt.original_balance,
            apr: debt.apr,
            monthlyPayment: debt.monthly_payment,
            firstPaymentDate: debt.first_payment_date,
          }
        : null,
    [debt],
  )

  const baseline = useMemo(() => (terms ? snapshot(terms) : null), [terms])
  const withExtra = useMemo(
    () => (terms ? comparePayoff(terms, { extraMonthly, extraOnce }) : null),
    [terms, extraMonthly, extraOnce],
  )

  // For the balance-over-time chart, compare the two schedules from today.
  const chartData = useMemo(() => {
    if (!terms || !baseline || baseline.neverPaysOff) return []
    const today = new Date()
    const baseFromToday = amortize({
      originalBalance: baseline.currentBalance,
      apr: terms.apr,
      monthlyPayment: terms.monthlyPayment,
      firstPaymentDate: toISO(today),
    })
    const withFromToday = amortize(
      {
        originalBalance: baseline.currentBalance,
        apr: terms.apr,
        monthlyPayment: terms.monthlyPayment,
        firstPaymentDate: toISO(today),
      },
      { extraMonthly, extraOnce },
    )
    const maxLen = Math.max(baseFromToday.schedule.length, withFromToday.schedule.length)
    const rows: Array<{ date: string; baseline: number; withExtra: number | null }> = []
    for (let i = 0; i < maxLen; i++) {
      const b = baseFromToday.schedule[i]
      const w = withFromToday.schedule[i]
      rows.push({
        date: b?.date ?? w?.date ?? '',
        baseline: b ? b.balance : 0,
        withExtra: w ? w.balance : null,
      })
    }
    return rows
  }, [terms, baseline, extraMonthly, extraOnce])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">Loading…</div>
    )
  }
  if (!debt || !baseline || !terms) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Debt not found.</p>
        <Link href="/debts" className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-600">
          <ArrowLeft className="h-4 w-4" /> Back to debts
        </Link>
      </div>
    )
  }

  const hasExtra = extraMonthly > 0 || extraOnce > 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href="/debts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All debts
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {debt.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {DEBT_TYPE_LABELS[debt.debt_type]} · {(debt.apr * 100).toFixed(2)}% APR ·{' '}
              {formatMoney(debt.monthly_payment)} / month
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Balance today" value={baseline.currentBalance} accent="rose" />
        <Stat
          label="Payments left"
          value={baseline.paymentsRemaining}
          isCurrency={false}
          suffix=" months"
        />
        <Stat label="Interest to go" value={baseline.interestRemaining} />
        <Stat label="Total remaining cost" value={baseline.totalCostRemaining} accent="violet" />
      </div>

      {baseline.payoffDate && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
          At the current pace you&apos;ll finish on{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatDate(baseline.payoffDate, { long: true })}
          </span>
          , paying{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatMoney(baseline.interestPaidToDate + baseline.interestRemaining)}
          </span>{' '}
          in interest total over the life of the loan.
        </div>
      )}

      {/* Payoff advisor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            </div>
            <CardTitle className="text-lg font-semibold">Payoff advisor</CardTitle>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pay a little more each month or drop a one-time lump sum. See what you save.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tier chips */}
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Extra per month
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <TierChip active={extraMonthly === 0} onClick={() => setExtraMonthly(0)} label="Base" />
              {TIER_STEPS.map((v) => (
                <TierChip
                  key={v}
                  active={extraMonthly === v}
                  onClick={() => setExtraMonthly(v)}
                  label={`+${formatMoney(v)}`}
                />
              ))}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Custom</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={10}
                  min={0}
                  value={extraMonthly || ''}
                  onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 w-28"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              One-time lump sum (next payment)
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step={100}
                min={0}
                value={extraOnce || ''}
                onChange={(e) => setExtraOnce(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-40"
                placeholder="0"
              />
              {extraOnce > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setExtraOnce(0)}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Savings summary */}
          {withExtra && hasExtra && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 md:grid-cols-3">
              <SavingsStat
                label="Payoff moves to"
                value={
                  withExtra.withExtra.payoffDate
                    ? formatDate(withExtra.withExtra.payoffDate, { long: true })
                    : '—'
                }
              />
              <SavingsStat
                label="Months saved"
                value={`${withExtra.monthsSaved} month${withExtra.monthsSaved === 1 ? '' : 's'}`}
                icon={<TrendingDown className="h-3 w-3 text-emerald-600" strokeWidth={2.25} />}
              />
              <SavingsStat
                label="Interest saved"
                value={formatMoney(withExtra.interestSaved)}
                accent="emerald"
              />
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-3 text-xs">
                <LegendDot color="#94a3b8" label="Minimum payment" />
                {hasExtra && <LegendDot color="#10b981" label="With extra" />}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="baseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="extraFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(iso: string) => formatDate(iso).split(',')[0]}
                    interval={Math.max(1, Math.floor(chartData.length / 8))}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatMoney(v, { compact: true })}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: 12,
                    }}
                    labelFormatter={(iso: string) => formatDate(iso, { long: true })}
                    formatter={(v: number) => [formatMoney(v)]}
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    fill="url(#baseFill)"
                    dot={false}
                    isAnimationActive={false}
                    name="Minimum"
                  />
                  {hasExtra && (
                    <Area
                      type="monotone"
                      dataKey="withExtra"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#extraFill)"
                      dot={false}
                      isAnimationActive={false}
                      name="With extra"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = 'default',
  isCurrency = true,
  suffix,
}: {
  label: string
  value: number
  accent?: 'default' | 'rose' | 'violet'
  isCurrency?: boolean
  suffix?: string
}) {
  const valueClass =
    accent === 'rose'
      ? 'text-rose-600 dark:text-rose-400'
      : accent === 'violet'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-900 dark:text-slate-50'
  const displayed = isCurrency ? formatMoney(value) : `${value}${suffix ?? ''}`
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        title={displayed}
        className={cn('mt-1.5 truncate text-lg font-semibold tabular-nums sm:text-xl', valueClass)}
      >
        {displayed}
      </div>
    </div>
  )
}

function TierChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
      )}
    >
      {label}
    </button>
  )
}

function SavingsStat({
  label,
  value,
  accent = 'default',
  icon,
}: {
  label: string
  value: string
  accent?: 'default' | 'emerald'
  icon?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-800/70 dark:text-emerald-300/70">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-base font-semibold tabular-nums',
          accent === 'emerald'
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-slate-900 dark:text-slate-50',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
