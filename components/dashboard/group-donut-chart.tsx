'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/shared/format'

type Props = {
  fixed: number
  variable: number
  isLoading: boolean
}

const FIXED_COLOR = '#059669' // emerald-600
const VARIABLE_COLOR = '#cbd5e1' // slate-300

export function GroupDonutChart({ fixed, variable, isLoading }: Props) {
  const total = fixed + variable
  const empty = !isLoading && total === 0
  const data = [
    { name: 'Fixed', value: fixed, color: FIXED_COLOR },
    { name: 'Variable', value: variable, color: VARIABLE_COLOR },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">This month spend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : empty ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No spending yet this month.
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [formatMoney(v), name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                {formatMoney(total)}
              </div>
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <LegendDot label="Fixed" value={fixed} color={FIXED_COLOR} />
              <LegendDot label="Variable" value={variable} color={VARIABLE_COLOR} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LegendDot({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(value, { compact: true })}</span>
    </div>
  )
}
