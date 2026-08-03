'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Quick-access shortcuts across the top of every authenticated page.
 * The sidebar has ALL 15 routes; these pills are the ~5 most-used, so users
 * don't have to open the sidebar for the common paths.
 */
const PILLS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/forecast', label: 'Forecast' },
  { href: '/invest', label: 'Investments' },
  { href: '/assistant', label: 'Assistant' },
]

export function TopBar() {
  const path = usePathname()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      {/* Center: pill tabs — hidden on small screens */}
      <nav className="hidden flex-1 justify-center md:flex">
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-900">
          {PILLS.map((p) => {
            const active = path === p.href || path.startsWith(p.href + '/')
            return (
              <Link
                key={p.href}
                href={p.href}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {p.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* On small screens the pills disappear — the sidebar is still available. */}
      <div className="flex-1 md:hidden" />

      {/* Right: search + notifications */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Search (coming soon)"
          aria-label="Search"
        >
          <Search className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Notifications (coming soon)"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
