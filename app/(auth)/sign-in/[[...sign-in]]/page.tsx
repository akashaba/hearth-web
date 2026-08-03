import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in to pick up right where you left off.
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'w-full shadow-none border-0',
            card: 'shadow-none border-0 bg-transparent w-full',
            header: 'hidden',
            socialButtons: 'gap-2',
            socialButtonsBlockButton:
              'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl h-11 text-sm font-medium normal-case',
            socialButtonsBlockButtonText: 'font-medium',
            dividerRow: 'my-4',
            dividerLine: 'bg-slate-200 dark:bg-slate-800',
            dividerText: 'text-slate-400 dark:text-slate-500 text-xs',
            formFieldRow: 'mb-3',
            formFieldLabel: 'text-sm font-medium text-slate-700 dark:text-slate-300 normal-case',
            formFieldInput:
              'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-11 px-3.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
            formButtonPrimary:
              'bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all normal-case',
            footer: 'hidden',
            identityPreview:
              'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900',
          },
          layout: {
            socialButtonsPlacement: 'top',
            socialButtonsVariant: 'blockButton',
          },
        }}
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link
          href="/sign-up"
          className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
