'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useCashflowForecast } from '@/lib/hooks/use-cashflow-forecast'
import { useSetup } from '@/lib/hooks/use-setup'
import { useFixedDeductions } from '@/lib/hooks/use-fixed-deductions'
import { fixedDeductionDate } from '@/shared/projections'
import { formatDate, formatMoney } from '@/shared/format'

const HORIZONS = [30, 60, 90, 180] as const
type Horizon = (typeof HORIZONS)[number]

type UpcomingEvent = {
  date: string
  label: string
  amount: number
  type: 'income' | 'expense'
}

export function ForecastView() {
  const [days, setDays] = useState<Horizon>(90)
  const [danger, setDanger] = useState(500)
  const { data, isLoading } = useCashflowForecast(days, danger)
  const { data: setup } = useSetup()
  const { data: deductions = [] } = useFixedDeductions()

  const events = useMemo<UpcomingEvent[]>(() => {
    const out: UpcomingEvent[] = []
    const today = stripTime(new Date())
    const end = new Date(today.getTime() + days * 86400_000)

    // Biweekly paychecks anchored to setup.first_payday.
    if (setup?.first_payday && setup.paycheck_amount > 0) {
      const step = 14 * 86400_000
      const anchor = new Date(setup.first_payday + 'T00:00:00').getTime()
      const stepsFromAnchor = Math.floor((today.getTime() - anchor) / step)
      let cursor = anchor + stepsFromAnchor * step
      if (cursor < today.getTime()) cursor += step
      while (cursor <= end.getTime()) {
        out.push({
          date: toISO(new Date(cursor)),
          label: 'Paycheck',
          amount: setup.paycheck_amount,
          type: 'income',
        })
        cursor += step
      }
    }

    // Fixed deductions for each month in the window.
    const months = distinctMonths(today, end)
    for (const d of deductions) {
      if (!d.enabled) continue
      for (const [y, m] of months) {
        const fireDate = fixedDeductionDate(d.day_of_month, y, m)
        if (fireDate.getTime() < today.getTime() || fireDate.getTime() > end.getTime()) continue
        out.push({
          date: toISO(fireDate),
          label: d.name,
          amount: d.amount,
          type: 'expense',
        })
      }
    }

    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    return out
  }, [setup, deductions, days])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Cashflow forecast
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projected balance from your biweekly income, fixed deductions, and trailing variable spend.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-800">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setDays(h)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  days === h
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {h}d
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="danger" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Alert below
              </Label>
              <Input
                id="danger"
                type="number"
                min={0}
                step={100}
                value={danger}
                onChange={(e) => setDanger(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-28"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danger callout */}
      {data?.dangerCrossingDate && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
              Balance drops below {formatMoney(danger)} on {formatDate(data.dangerCrossingDate, { long: true })}
            </p>
            <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
              Adjust variable spend or shift a fixed deduction to buy runway before that date.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Today" value={data?.points[0]?.balance ?? 0} />
        <Stat label={`In ${Math.min(30, days)} days`} value={valueAt(data?.points, Math.min(30, days))} />
        <Stat label={`In ${days} days`} value={data?.endBalance ?? 0} />
        <Stat
          label="Lowest point"
          value={data?.minBalance ?? 0}
          sub={data?.minBalanceDate ? formatDate(data.minBalanceDate) : undefined}
          tone={data && data.minBalance < danger ? 'warn' : 'default'}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {days}-day projection
          </CardTitle>
          {data && (
            <p className="text-xs text-muted-foreground">
              Variable spend rate: {formatMoney(data.avgDailyVariable)} / day
              {' • '}
              starting balance {formatMoney(data.points[0]?.balance ?? 0)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : data.points.every((p) => p.balance === data.points[0].balance) ? (
            <div className="flex h-[360px] items-center justify-center text-center text-sm text-muted-foreground">
              Fill in Setup (starting balance + biweekly income) to project your cashflow.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={data.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(iso: string) => formatDate(iso).split(',')[0]}
                  interval={Math.floor(days / 6)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => formatMoney(v, { compact: true })}
                  width={72}
                />
                <ReferenceArea
                  y1={-Infinity}
                  y2={danger}
                  fill="#fecaca"
                  fillOpacity={0.35}
                  ifOverflow="extendDomain"
                />
                <ReferenceLine y={danger} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip
                  cursor={{ stroke: '#059669', strokeDasharray: '3 3' }}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                  labelFormatter={(iso: string) => formatDate(iso, { long: true })}
                  formatter={(v: number) => [formatMoney(v), 'Projected']}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#forecastFill)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Upcoming events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Scheduled events</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every paycheck and fixed deduction the projection is counting on.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No scheduled income or fixed deductions in this window.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((e, i) => (
                <li key={`${e.date}-${e.label}-${i}`} className="flex items-center gap-3 px-6 py-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      e.type === 'income'
                        ? 'bg-emerald-100 dark:bg-emerald-950/40'
                        : 'bg-rose-100 dark:bg-rose-950/40',
                    )}
                  >
                    {e.type === 'income' ? (
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {e.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.date, { long: true })}</p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      e.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100',
                    )}
                  >
                    {e.type === 'income' ? '+' : '−'}
                    {formatMoney(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: number
  sub?: string
  tone?: 'default' | 'warn'
}) {
  const isNegative = value < 0
  const valueColor =
    tone === 'warn' || isNegative
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-slate-50'
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5">
        {tone === 'warn' && <TrendingDown className="h-3 w-3 shrink-0 text-rose-500" strokeWidth={2.25} />}
        <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      <div
        title={formatMoney(value)}
        className={cn('mt-1.5 truncate text-lg font-semibold tabular-nums sm:text-xl', valueColor)}
      >
        {formatMoney(value)}
      </div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function valueAt(
  points: Array<{ day: number; balance: number }> | undefined,
  day: number,
): number {
  if (!points) return 0
  return points.find((p) => p.day === day)?.balance ?? points[points.length - 1]?.balance ?? 0
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function distinctMonths(start: Date, end: Date): Array<[number, number]> {
  const set = new Set<string>()
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const stopKey = `${end.getFullYear()}-${end.getMonth()}`
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`
    set.add(key)
    if (key === stopKey) break
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return Array.from(set).map((k) => k.split('-').map(Number) as [number, number])
}
