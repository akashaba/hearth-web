'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadView } from './upload-view'
import { ReviewTable, type ReviewRow } from './review-table'
import { AccountPicker } from '@/components/common/account-picker'
import { useParseBankPdf, useBulkInsertTransactions } from '@/lib/hooks/use-bank-import'
import { useCategories } from '@/lib/hooks/use-categories'
import { useAccounts } from '@/lib/hooks/use-accounts'
import { useTransactions } from '@/lib/hooks/use-transactions'
import type { BankParseResponse } from '@/shared/schemas/bank-import'
import type { CategoryGroup } from '@/shared/categories'

type Phase =
  | { kind: 'upload' }
  | { kind: 'parsing'; file: File }
  | { kind: 'review'; file: File; parsed: BankParseResponse }
  | { kind: 'done'; imported: number }

export function BankImportView() {
  const [phase, setPhase] = useState<Phase>({ kind: 'upload' })
  const parse = useParseBankPdf()
  const insert = useBulkInsertTransactions()
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()

  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
  }, [accountId, accounts])

  // Derive per-parsed-row state (category id, selected). Keyed by index because
  // Gemini output has no natural id.
  const [rowState, setRowState] = useState<
    Record<string, { category_id: string | undefined; group: CategoryGroup | undefined; selected: boolean }>
  >({})

  const parsedTxs = phase.kind === 'review' ? phase.parsed.transactions : []

  // Fetch existing transactions in the date range of the parsed rows for dedupe.
  const dateRange = useMemo(() => {
    if (parsedTxs.length === 0) return null
    let min = parsedTxs[0].date
    let max = parsedTxs[0].date
    for (const t of parsedTxs) {
      if (t.date < min) min = t.date
      if (t.date > max) max = t.date
    }
    return { start: min, end: max }
  }, [parsedTxs])

  const { data: existingInRange = [] } = useTransactions(
    dateRange ? { start: dateRange.start, end: dateRange.end } : undefined,
  )

  // Initialize rowState when parse lands: resolve suggested category names → ids, mark all New rows selected.
  useEffect(() => {
    if (phase.kind !== 'review') return
    const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]))
    const dupeKey = (date: string, amount: number, categoryId: string | undefined) =>
      `${date}|${amount.toFixed(2)}|${categoryId ?? ''}`
    const existingKeys = new Set(
      existingInRange.map((t) => dupeKey(t.date, t.amount, t.category?.id)),
    )
    const next: typeof rowState = {}
    parsedTxs.forEach((t, i) => {
      const cat = t.suggested_category
        ? catByName.get(t.suggested_category.toLowerCase())
        : undefined
      const isDupe = existingKeys.has(dupeKey(t.date, t.amount, cat?.id))
      next[String(i)] = {
        category_id: cat?.id,
        group: cat?.group_type,
        selected: !isDupe,
      }
    })
    setRowState(next)
    // Deliberately only re-run when parse or the referenced data changes — not on rowState edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, categories, existingInRange])

  const reviewRows: ReviewRow[] = useMemo(() => {
    const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]))
    const existingKeys = new Set(
      existingInRange.map(
        (t) => `${t.date}|${t.amount.toFixed(2)}|${t.category?.id ?? ''}`,
      ),
    )
    return parsedTxs.map((t, i) => {
      const state = rowState[String(i)] ?? {
        category_id: undefined,
        group: undefined,
        selected: true,
      }
      const dupeKey = `${t.date}|${t.amount.toFixed(2)}|${state.category_id ?? ''}`
      const isDupe = existingKeys.has(dupeKey)
      return {
        key: String(i),
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: state.category_id ?? catByName.get(t.suggested_category?.toLowerCase() ?? '')?.id,
        category_group: state.group ?? catByName.get(t.suggested_category?.toLowerCase() ?? '')?.group_type,
        isDuplicate: isDupe,
        selected: state.selected && !isDupe,
      }
    })
  }, [parsedTxs, categories, existingInRange, rowState])

  const counts = useMemo(() => {
    const total = reviewRows.length
    const dupes = reviewRows.filter((r) => r.isDuplicate).length
    const selected = reviewRows.filter((r) => r.selected).length
    return { total, dupes, new: total - dupes, selected }
  }, [reviewRows])

  const startParse = async (file: File) => {
    setPhase({ kind: 'parsing', file })
    try {
      const parsed = await parse.mutateAsync(file)
      setPhase({ kind: 'review', file, parsed })
      if (parsed.transactions.length === 0) {
        toast.warning('No transactions found in that PDF')
      }
    } catch (e) {
      toast.error((e as Error).message)
      setPhase({ kind: 'upload' })
    }
  }

  const importSelected = async () => {
    if (!accountId) {
      toast.error('Pick an account first')
      return
    }
    const missingCategory = reviewRows.filter((r) => r.selected && !r.category_id)
    if (missingCategory.length > 0) {
      toast.error(`${missingCategory.length} selected row(s) still need a category`)
      return
    }
    const payload = reviewRows
      .filter((r) => r.selected)
      .map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        category_id: r.category_id!,
        account_id: accountId,
        notes: null,
      }))
    try {
      const inserted = await insert.mutateAsync(payload)
      setPhase({ kind: 'done', imported: inserted })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Bank Import
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a bank statement PDF. We extract transactions with Gemini, mark ones you
          already have, and let you review before saving.
        </p>
      </div>

      {phase.kind === 'upload' && <UploadView onSelected={startParse} />}

      {phase.kind === 'parsing' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <div className="text-sm font-medium">Reading {phase.file.name}…</div>
            <div className="text-xs text-muted-foreground">This usually takes 5-15 seconds.</div>
          </CardContent>
        </Card>
      )}

      {phase.kind === 'review' && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end justify-between gap-4 p-6">
              <div className="flex flex-wrap gap-6 text-sm">
                <Stat label="Total found" value={counts.total} />
                <Stat label="Already imported" value={counts.dupes} tone="muted" />
                <Stat label="New" value={counts.new} tone="new" />
                <Stat label="Selected" value={counts.selected} tone="selected" />
              </div>
              <div className="flex items-end gap-3">
                <div className="min-w-[12rem]">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Import into
                  </div>
                  <AccountPicker value={accountId} onChange={setAccountId} />
                </div>
                <Button variant="outline" onClick={() => setPhase({ kind: 'upload' })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Start over
                </Button>
                <Button onClick={importSelected} disabled={insert.isPending || counts.selected === 0}>
                  {insert.isPending
                    ? 'Importing…'
                    : `Import ${counts.selected} transaction${counts.selected === 1 ? '' : 's'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <ReviewTable
                rows={reviewRows}
                onToggle={(key, selected) => {
                  setRowState((s) => ({
                    ...s,
                    [key]: { ...(s[key] ?? { category_id: undefined, group: undefined }), selected },
                  }))
                }}
                onCategoryChange={(key, id, group) => {
                  setRowState((s) => ({
                    ...s,
                    [key]: { ...(s[key] ?? { selected: true }), category_id: id, group },
                  }))
                }}
                onToggleAllNew={(selected) => {
                  setRowState((s) => {
                    const next = { ...s }
                    for (const r of reviewRows) {
                      if (r.isDuplicate) continue
                      next[r.key] = { ...(next[r.key] ?? { category_id: r.category_id, group: r.category_group }), selected }
                    }
                    return next
                  })
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      {phase.kind === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-lg font-semibold">
                Imported {phase.imported} transaction{phase.imported === 1 ? '' : 's'}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Your Dashboard and Transactions view have updated.
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase({ kind: 'upload' })}>
                Import another statement
              </Button>
              <Link href="/transactions">
                <Button>View transactions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'muted' | 'new' | 'selected'
}) {
  const color =
    tone === 'muted'
      ? 'text-muted-foreground'
      : tone === 'new'
        ? 'text-emerald-600 dark:text-emerald-400'
        : tone === 'selected'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-slate-900 dark:text-slate-50'
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
