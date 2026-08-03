'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiCard } from './kpi-card'
import { CategoryBreakdownTable } from './category-breakdown-table'
import { MonthlyFlowChart } from './monthly-flow-chart'
import { GroupDonutChart } from './group-donut-chart'
import { CashflowForecastChart } from './cashflow-forecast-chart'
import { TransactionDialog } from '@/components/transactions/transaction-dialog'
import { useDashboard, pctDelta } from '@/lib/hooks/use-dashboard'
import { useCurrentHousehold } from '@/lib/hooks/use-current-household'
import { useUser } from '@clerk/nextjs'

type DialogState = null | { defaultType: 'debit' | 'credit' }

export function DashboardView() {
  const { user } = useUser()
  const household = useCurrentHousehold()
  const { kpis, byCategoryThisMonth, monthlyFlow, hasSetup, isLoading } = useDashboard()
  const [dialog, setDialog] = useState<DialogState>(null)

  const firstName =
    user?.firstName ?? user?.username ?? household.data?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDialog({ defaultType: 'credit' })}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
          >
            <Plus className="mr-2 h-4 w-4" /> Add income
          </Button>
          <Button onClick={() => setDialog({ defaultType: 'debit' })}>
            <Minus className="mr-2 h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      {!hasSetup && !isLoading && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <div>
            <div className="font-medium text-amber-900 dark:text-amber-200">
              Set your starting balance
            </div>
            <div className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
              Current Balance shows $0 until you fill in Setup.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Current Balance" value={kpis.currentBalance} />
        <KpiCard
          label="This Month Income"
          value={kpis.thisMonthIncome}
          deltaPct={pctDelta(kpis.thisMonthIncome, kpis.lastMonthIncome)}
        />
        <KpiCard
          label="This Month Expenses"
          value={kpis.thisMonthExpenses}
          deltaPct={pctDelta(kpis.thisMonthExpenses, kpis.lastMonthExpenses)}
          invertDeltaColor
        />
        <KpiCard
          label="Saved This Month"
          value={kpis.thisMonthSaved}
          deltaPct={pctDelta(kpis.thisMonthSaved, kpis.lastMonthSaved)}
        />
      </div>

      <CashflowForecastChart />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyFlowChart data={monthlyFlow} isLoading={isLoading} />
        </div>
        <GroupDonutChart
          fixed={kpis.thisMonthFixed}
          variable={kpis.thisMonthVariable}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CategoryBreakdownTable rows={byCategoryThisMonth} isLoading={isLoading} />
        </div>
        <div className="flex flex-col gap-4">
          <KpiCard label="Starting Balance" value={kpis.startingBalance} />
          <KpiCard label="Total Saved (all-time)" value={kpis.totalSaved} />
        </div>
      </div>

      <TransactionDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        defaultType={dialog?.defaultType ?? 'debit'}
      />
    </div>
  )
}
