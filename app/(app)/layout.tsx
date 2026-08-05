import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/sidebar'
import { TopBar } from '@/components/nav/top-bar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Idempotent: creates a household on the caller's first sign-in, returns their existing one otherwise.
  // Runs server-side so no page ever renders without a household to key data off.
  const supabase = await createSupabaseServer()
  await supabase.rpc('bootstrap_household')

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/*
          Default padding for pages that don't self-pad (dashboard, summary,
          budgets, goals). Newer views (forecast, debts, invest, transactions,
          merchants, subscriptions, household, invest) wrap their own root in
          `p-6 lg:p-8` — the extra padding stacks but is harmless (Tailwind
          `p-6` here + child `p-6` there = only child renders since flex fills).
          If any page looks off, tell me and I'll thin the offending self-pad.
        */}
        {/* p-4 on mobile, p-6/p-8 on larger — a 375px viewport with p-6 was
            eating 20% of horizontal space. */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
