import { SetupForm } from '@/components/setup/setup-form'
import { FixedDeductionsGrid } from '@/components/setup/fixed-deductions-grid'
import { RecurringSuggestionsCard } from '@/components/setup/recurring-suggestions-card'

export default function SetupPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Setup
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time configuration. Fill this out first — every projection and forecast keys off it.
        </p>
      </div>
      <RecurringSuggestionsCard />
      <SetupForm />
      <FixedDeductionsGrid />
    </div>
  )
}
