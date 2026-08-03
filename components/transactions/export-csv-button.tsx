'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { TransactionRow } from '@/lib/hooks/use-transactions'

type Props = {
  rows: TransactionRow[]
  disabled?: boolean
}

/**
 * Client-side CSV export. Writes a Blob and triggers a download — no server
 * round-trip. Reflects whatever filters are currently applied to `rows`.
 */
export function ExportCsvButton({ rows, disabled }: Props) {
  const onExport = () => {
    if (rows.length === 0) {
      toast.error('Nothing to export in the current filter.')
      return
    }
    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} transaction${rows.length === 1 ? '' : 's'}`)
  }

  return (
    <Button variant="outline" onClick={onExport} disabled={disabled || rows.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}

const HEADERS = [
  'date',
  'description',
  'amount',
  'type',
  'category',
  'category_group',
  'account',
  'notes',
] as const

function toCsv(rows: TransactionRow[]): string {
  const lines = [HEADERS.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.description,
        // Sign the amount: credit=positive, debit=negative. Common convention
        // for CSV imports into other tools (Excel, GnuCash, etc.).
        r.type === 'credit' ? r.amount.toFixed(2) : `-${r.amount.toFixed(2)}`,
        r.type,
        r.category?.name ?? '',
        r.category?.group_type ?? '',
        r.account?.name ?? '',
        r.notes ?? '',
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  // Trailing newline plays nicer with Excel + `wc -l` alike.
  return lines.join('\n') + '\n'
}

function csvEscape(v: string | number): string {
  const s = String(v)
  // RFC 4180: quote if the field contains comma, quote, or newline; escape quotes by doubling.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
