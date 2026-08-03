'use client'

import { useMemo } from 'react'
import { useTransactions } from './use-transactions'
import { normalizeMerchant } from '@/shared/merchant'

export type MerchantRow = {
  merchant: string
  total: number
  count: number
  avg: number
  lastSeen: string
  lastRawDescription: string
  topCategory: string | null
}

/**
 * Groups debit transactions by normalized merchant name. `windowDays` limits
 * to a recent window (default 90); pass 0 for all time.
 */
export function useTopMerchants(windowDays = 90): {
  data: MerchantRow[]
  isLoading: boolean
} {
  const { data: txs = [], isLoading } = useTransactions()

  const data = useMemo<MerchantRow[]>(() => {
    const cutoffIso =
      windowDays > 0 ? new Date(Date.now() - windowDays * 86400_000).toISOString().slice(0, 10) : ''
    type Bucket = {
      merchant: string
      total: number
      count: number
      lastSeen: string
      lastRawDescription: string
      catCounts: Map<string, number>
    }
    const buckets = new Map<string, Bucket>()
    for (const t of txs) {
      if (t.type !== 'debit') continue
      if (cutoffIso && t.date < cutoffIso) continue
      const key = normalizeMerchant(t.description)
      if (!key) continue
      const b = buckets.get(key) ?? {
        merchant: key,
        total: 0,
        count: 0,
        lastSeen: t.date,
        lastRawDescription: t.description,
        catCounts: new Map(),
      }
      b.total += t.amount
      b.count += 1
      if (t.date > b.lastSeen) {
        b.lastSeen = t.date
        b.lastRawDescription = t.description
      }
      if (t.category?.name) {
        b.catCounts.set(t.category.name, (b.catCounts.get(t.category.name) ?? 0) + 1)
      }
      buckets.set(key, b)
    }
    const rows: MerchantRow[] = [...buckets.values()].map((b) => {
      let topCategory: string | null = null
      let topCount = 0
      for (const [name, c] of b.catCounts) {
        if (c > topCount) {
          topCategory = name
          topCount = c
        }
      }
      return {
        merchant: b.merchant,
        total: b.total,
        count: b.count,
        avg: b.count > 0 ? b.total / b.count : 0,
        lastSeen: b.lastSeen,
        lastRawDescription: b.lastRawDescription,
        topCategory,
      }
    })
    return rows.sort((a, b) => b.total - a.total)
  }, [txs, windowDays])

  return { data, isLoading }
}
