'use client'

import { useState } from 'react'
import { Lightbulb, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FixedDeductionDialog } from './fixed-deduction-dialog'
import {
  usePendingRecurringSuggestions,
  useUpdateSuggestionStatus,
  type RecurringSuggestion,
} from '@/lib/hooks/use-recurring-suggestions'
import { formatMoney } from '@/shared/format'

/**
 * Only renders when there is at least one pending suggestion. The detection cron
 * that populates recurring_suggestions is a separate slice — until then this card
 * stays invisible.
 */
export function RecurringSuggestionsCard() {
  const { data: suggestions, isLoading } = usePendingRecurringSuggestions()
  const updateStatus = useUpdateSuggestionStatus()
  const [accepting, setAccepting] = useState<RecurringSuggestion | null>(null)

  if (isLoading || suggestions.length === 0) return null

  const dismiss = async (s: RecurringSuggestion) => {
    try {
      await updateStatus.mutateAsync({ id: s.id, status: 'dismissed' })
      toast.success('Suggestion dismissed')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <Lightbulb className="h-4 w-4 text-emerald-700 dark:text-emerald-300" strokeWidth={1.75} />
        </div>
        <div>
          <CardTitle className="text-base">Suggested recurring bills</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            We noticed these look like monthly bills. Add them to your fixed deductions or dismiss.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
          {suggestions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {s.merchant} — {formatMoney(s.avg_amount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  ~day {s.avg_day_of_month} · seen {s.occurrence_count} times
                  {s.suggested_category ? ` · ${s.suggested_category.name}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => dismiss(s)} disabled={updateStatus.isPending}>
                  <X className="mr-1 h-4 w-4" /> Dismiss
                </Button>
                <Button size="sm" onClick={() => setAccepting(s)}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <FixedDeductionDialog
        open={!!accepting}
        onOpenChange={(o) => !o && setAccepting(null)}
        initialValues={
          accepting
            ? {
                name: accepting.merchant,
                amount: accepting.avg_amount,
                day_of_month: accepting.avg_day_of_month,
                category_id: accepting.suggested_category_id ?? undefined,
                enabled: true,
              }
            : undefined
        }
        onCreated={async () => {
          if (!accepting) return
          try {
            await updateStatus.mutateAsync({ id: accepting.id, status: 'accepted' })
          } catch {
            // Deduction was created; if the status update fails we don't want to
            // toast an error over the success toast the dialog already showed.
          }
        }}
      />
    </Card>
  )
}
