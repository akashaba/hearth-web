'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileSidebar } from '@/lib/hooks/use-mobile-sidebar'
import { NotificationsTray } from './notifications-tray'

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
  const { setOpen } = useMobileSidebar()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md md:gap-4 md:px-6 dark:border-slate-800 dark:bg-slate-950/70">
      {/* Mobile-only: hamburger + inline brand mark (since sidebar is hidden). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <Image
          src="/logo-192.png"
          alt="Hearth"
          className="h-7 w-7 rounded-md"
          width={28}
          height={28}
        />
        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Hearth
        </span>
      </Link>

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
        <NotificationsTray />
      </div>
    </header>
  )
}
