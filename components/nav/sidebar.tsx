'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  Building2,
  CandlestickChart,
  ChevronsLeft,
  ChevronsRight,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListMinus,
  PiggyBank,
  Repeat,
  ScrollText,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/hooks/use-sidebar'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ListMinus },
  { href: '/projected', label: 'Projected', icon: LineChart },
  { href: '/forecast', label: 'Forecast', icon: TrendingUp },
  { href: '/summary', label: 'Summary', icon: ScrollText },
  { href: '/merchants', label: 'Merchants', icon: Building2 },
  { href: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/debts', label: 'Debts', icon: Landmark },
  { href: '/invest', label: 'Investments', icon: CandlestickChart },
  { href: '/assistant', label: 'Assistant', icon: Sparkles },
  { href: '/import', label: 'Bank Import', icon: Wallet },
  { href: '/household', label: 'Household', icon: Users },
  { href: '/setup', label: 'Setup', icon: Settings },
]

export function Sidebar() {
  const path = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* ─── Brand ─────────────────────────────────────── */}
      <div className={cn('py-6', collapsed ? 'px-3' : 'px-6')}>
        <Link
          href="/dashboard"
          className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}
          title={collapsed ? 'Hearth' : undefined}
        >
          <Image
            src="/logo-192.png"
            alt="Hearth"
            className="h-11 w-11 shrink-0 rounded-lg"
            width={44}
            height={44}
            priority
          />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Hearth
              </span>
              <span className="truncate text-[10px] italic text-slate-500 dark:text-slate-400">
                Personal finance for your household
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ─── Nav ───────────────────────────────────────── */}
      <nav
        className={cn('flex-1 space-y-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center rounded-full text-sm font-medium transition-colors',
                collapsed ? 'h-11 w-full justify-center' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{label}</span>}
              {/* Hover tooltip when collapsed — small pill floating to the right. */}
              {collapsed && (
                <span
                  className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900"
                  role="tooltip"
                >
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ─── Footer: collapse toggle + user ───────────── */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mb-2 flex w-full items-center rounded-full py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            collapsed ? 'justify-center px-2' : 'justify-start gap-2 px-3',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" strokeWidth={2} />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
              Collapse
            </>
          )}
        </button>

        <div className={cn(collapsed && 'flex justify-center')}>
          <UserButton
            showName={!collapsed}
            appearance={{
              elements: {
                rootBox: collapsed ? '' : 'w-full',
                userButtonBox: collapsed ? '' : 'w-full flex-row-reverse justify-end gap-3',
              },
            }}
          />
        </div>
      </div>
    </aside>
  )
}
