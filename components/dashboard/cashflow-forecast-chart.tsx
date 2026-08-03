'use client'

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
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCashflowForecast } from '@/lib/hooks/use-cashflow-forecast'
import { formatDate, formatMoney } from '@/shared/format'

const DANGER = 500

export function CashflowForecastChart() {
  const { data, isLoading } = useCashflowForecast(90, DANGER)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">Cashflow forecast — 90 days</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Projected balance using biweekly income, fixed deductions, and your recent variable spend rate.
            </p>
          </div>
          {data?.dangerCrossingDate && (
            <div className="flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              Below {formatMoney(DANGER)} on {formatDate(data.dangerCrossingDate)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : data.points.every((p) => p.balance === data.points[0].balance) ? (
          <div className="flex h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
            Fill in Setup (starting balance + biweekly income) to project your cashflow.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashflowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
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
                  interval={13}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => formatMoney(v, { compact: true })}
                  width={64}
                />
                {/* Danger zone shaded below threshold. */}
                <ReferenceArea
                  y1={-Infinity}
                  y2={DANGER}
                  fill="#fecaca"
                  fillOpacity={0.35}
                  ifOverflow="extendDomain"
                />
                <ReferenceLine
                  y={DANGER}
                  stroke="#f87171"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
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
                  fill="url(#cashflowFill)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <Stat label="In 30 days" value={valueAt(data.points, 30)} />
              <Stat label="In 60 days" value={valueAt(data.points, 60)} />
              <Stat label="In 90 days" value={data.endBalance} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function valueAt(points: Array<{ day: number; balance: number }>, day: number): number {
  return points.find((p) => p.day === day)?.balance ?? points[points.length - 1]?.balance ?? 0
}

function Stat({ label, value }: { label: string; value: number }) {
  const isNegative = value < 0
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-base font-semibold tabular-nums ${
          isNegative
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {formatMoney(value)}
      </div>
    </div>
  )
}
