'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/shared/format'

export type MonthlyFlowPoint = {
  label: string
  income: number
  expense: number
}

type Props = {
  data: MonthlyFlowPoint[]
  isLoading: boolean
}

export function MonthlyFlowChart({ data, isLoading }: Props) {
  const empty = !isLoading && data.every((d) => d.income === 0 && d.expense === 0)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Money flow — last 6 months</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : empty ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No history yet — add transactions to see the trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v: number) => formatMoney(v, { compact: true })}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [formatMoney(v), name === 'income' ? 'Income' : 'Expense']}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value: string) => (value === 'income' ? 'Income' : 'Expense')}
              />
              <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
