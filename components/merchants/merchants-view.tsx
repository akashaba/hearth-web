'use client'

import { useMemo, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTopMerchants } from '@/lib/hooks/use-top-merchants'
import { formatDate, formatMoney } from '@/shared/format'
import { cn } from '@/lib/utils'

const WINDOWS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 0 },
] as const

export function MerchantsView() {
  const [windowDays, setWindowDays] = useState<number>(90)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useTopMerchants(windowDays)

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase()
    if (!q) return data
    return data.filter((m) => m.merchant.includes(q))
  }, [data, search])

  const grandTotal = filtered.reduce((s, m) => s + m.total, 0)
  const topShare = grandTotal > 0 ? (filtered[0]?.total ?? 0) / grandTotal : 0

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Top merchants
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every place you spent money, ranked. Great for spotting where the leaks are.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-800">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWindowDays(w.days)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                windowDays === w.days
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search merchant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {search ? 'No merchants match that search.' : 'No spend in this window yet.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((m, i) => {
                const share = grandTotal > 0 ? m.total / grandTotal : 0
                return (
                  <li key={m.merchant} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 tabular-nums">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {m.merchant}
                          </div>
                          {m.topCategory && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {m.topCategory}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {m.count} transaction{m.count === 1 ? '' : 's'} · avg{' '}
                          {formatMoney(m.avg, { compact: true })} · last {formatDate(m.lastSeen)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                          {formatMoney(m.total)}
                        </div>
                        <div className="text-[10px] tabular-nums text-muted-foreground">
                          {(share * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                    {/* Share bar */}
                    <div className="ml-12 mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${topShare > 0 ? (share / topShare) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
