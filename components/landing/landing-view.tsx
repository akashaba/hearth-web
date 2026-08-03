import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Landmark,
  ReceiptText,
  Repeat,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
// Wallet is still referenced by the FEATURES grid below (not the brand mark).

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
]

const FEATURES = [
  {
    icon: Wallet,
    title: 'Every dollar, tracked',
    body: 'Transactions, budgets per category, and a running balance that reflects real cash on hand — not what your bank last synced.',
  },
  {
    icon: TrendingUp,
    title: 'Cashflow forecast',
    body: 'See exactly when your next paycheck lands, when fixed bills fire, and if your balance will dip too low. 30 / 60 / 90 / 180-day horizons.',
  },
  {
    icon: Landmark,
    title: 'Debt payoff advisor',
    body: 'Log your loans once. Instantly see interest remaining, payoff date, and what an extra $50/month would save.',
  },
  {
    icon: Repeat,
    title: 'Subscription audit',
    body: 'The app spots recurring charges automatically and shows the annual cost. Cancel what you don’t use with one click.',
  },
  {
    icon: Sparkles,
    title: 'AI assistant',
    body: 'Ask "am I ready to start investing?" or "how much did I spend on coffee?" — it reads your data and answers with real numbers.',
  },
  {
    icon: ReceiptText,
    title: 'Receipt scan',
    body: 'Snap a receipt on your phone. Gemini vision extracts each line item and drops them into your ledger.',
  },
]

const STATS = [
  { value: 'Zero', label: 'monthly fees' },
  { value: '90-day', label: 'cashflow projection' },
  { value: 'Bank-grade', label: 'row-level security' },
]

const STEPS = [
  {
    n: '01',
    title: 'Set your baseline',
    body: 'Enter your starting balance, biweekly income, and fixed monthly bills. Two minutes.',
  },
  {
    n: '02',
    title: 'Log or import',
    body: 'Add transactions as you go, scan receipts on the phone, or import a bank statement PDF.',
  },
  {
    n: '03',
    title: 'See where you’re headed',
    body: 'The dashboard, forecast, and assistant use the same data to answer "what do I actually have?"',
  },
]

const FAQ = [
  {
    q: 'Do you connect to my bank?',
    a: 'Not directly. You can import PDF statements — Gemini parses them and dedupes against what’s already there. Manual entry and receipt scans work too.',
  },
  {
    q: 'Where does my data live?',
    a: 'Supabase (Postgres). Every row is gated by household-level RLS, so only you (and anyone you invite) can read your data.',
  },
  {
    q: 'Is there an app?',
    a: 'Yes — the iPhone app has receipt scanning and push notifications for the weekly digest. Web has everything else including bank imports.',
  },
  {
    q: 'Does the assistant give financial advice?',
    a: 'It gives educational context based on your numbers — never personalized recommendations. It won’t tell you which stock to buy.',
  },
]

export function LandingView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* ─── Nav ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between rounded-full border border-slate-200/70 bg-white/70 px-5 py-2.5 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/60">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo-192.png"
              alt="Hearth"
              className="h-11 w-11 rounded-lg"
              width={44}
              height={44}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Hearth
              </span>
              <span className="hidden text-[10px] italic text-slate-500 dark:text-slate-400 sm:block">
                Personal finance for your household
              </span>
            </div>
          </Link>
          <nav className="hidden gap-6 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden text-sm font-medium text-slate-700 hover:text-slate-900 sm:block dark:text-slate-300 dark:hover:text-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Get started
            </Link>
          </div>
        </header>

        {/* ─── Hero ────────────────────────────────────────── */}
        <section className="grid gap-12 py-16 md:grid-cols-2 md:py-24 lg:gap-16 lg:py-28">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/60 dark:text-emerald-300">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Built for people who want the full picture
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-slate-50">
              Actually understand{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                where your money goes.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-400">
              A personal finance tracker that pairs a clean ledger with a cashflow forecast,
              debt-payoff advisor, and an AI assistant that knows your numbers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-[1.02] hover:bg-emerald-700"
              >
                Start for free
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-800 backdrop-blur transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                See features
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              No credit card required · Your data lives in your own Supabase project
            </p>
          </div>

          {/* Hero mockup */}
          <div className="relative flex items-center justify-center">
            {/* Decorative blur */}
            <div className="absolute -left-8 top-8 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-900/20" />
            <div className="absolute -right-4 bottom-8 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-900/20" />

            {/* Phone frame */}
            <div className="relative w-[280px] rounded-[2.5rem] border-[10px] border-slate-900 bg-white shadow-2xl dark:border-slate-800">
              <div className="rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-800 p-5 pb-8 pt-10">
                <div className="text-[10px] uppercase tracking-widest text-emerald-100">
                  Current balance
                </div>
                <div className="mt-2 text-3xl font-bold text-white tabular-nums">$12,847.32</div>
                <div className="mt-4 flex gap-2">
                  <div className="flex-1 rounded-xl bg-white/15 p-2.5 backdrop-blur">
                    <div className="text-[9px] uppercase tracking-wider text-emerald-100">
                      Income
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                      $5,240
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl bg-white/15 p-2.5 backdrop-blur">
                    <div className="text-[9px] uppercase tracking-wider text-emerald-100">
                      Spent
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                      $2,190
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 p-4">
                <MockRow label="Groceries" amount="-$42.18" tone="expense" />
                <MockRow label="Paycheck" amount="+$2,620" tone="income" />
                <MockRow label="Netflix" amount="-$15.49" tone="expense" />
                <MockRow label="Coffee" amount="-$4.75" tone="expense" />
              </div>
            </div>

            {/* Floating stat cards */}
            <div className="absolute -left-4 top-16 hidden rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-xl backdrop-blur md:block dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <TrendingUp className="h-3 w-3 text-emerald-600" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Savings rate
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">28%</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 bottom-24 hidden rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-xl backdrop-blur md:block dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <Target className="h-3 w-3 text-emerald-600" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    3 goals on track
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                    Emergency fund 68%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Stats strip ─────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200/70 bg-white/60 p-8 backdrop-blur md:grid-cols-3 dark:border-slate-800/60 dark:bg-slate-900/50">
          {STATS.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </section>

        {/* ─── Features ────────────────────────────────────── */}
        <section id="features" className="scroll-mt-16 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Everything you need
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
              Explore the standout features
            </h2>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
              Six tools that work together — because the answer to "should I save more or pay off
              debt?" needs all six to be honest.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/60 dark:bg-slate-900"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {f.body}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── How it works ────────────────────────────────── */}
        <section id="how" className="scroll-mt-16 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              How it works
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
              Set up in five minutes
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-slate-200/70 bg-white p-6 dark:border-slate-800/60 dark:bg-slate-900"
              >
                <div className="text-4xl font-bold text-emerald-600/20 dark:text-emerald-400/20">
                  {s.n}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FAQ ─────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-16 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <div className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Questions
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
                Common questions
              </h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-slate-200/70 bg-white p-5 open:shadow-md dark:border-slate-800/60 dark:bg-slate-900"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {f.q}
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────── */}
        <section className="my-12 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-10 text-center md:p-16">
          <div className="mx-auto max-w-2xl">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <BarChart3 className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              See your finances more clearly, starting today.
            </h2>
            <p className="mt-4 text-base text-emerald-100">
              Free to try. No credit card. Cancel any time — it&apos;s your data.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-emerald-700 shadow-lg transition-transform hover:scale-[1.02]"
            >
              Create your account
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────── */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 py-8 sm:flex-row dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/logo-192.png"
              alt="Hearth"
              className="h-10 w-10 rounded-lg"
              width={40}
              height={40}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Hearth
              </span>
              <span className="text-[10px] italic text-slate-500 dark:text-slate-400">
                Personal finance for your household
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Shield className="h-3 w-3" strokeWidth={2} /> Your data lives in your own Supabase
          </div>
        </footer>
      </div>
    </div>
  )
}

function MockRow({
  label,
  amount,
  tone,
}: {
  label: string
  amount: string
  tone: 'income' | 'expense'
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
      <div className="flex items-center gap-2">
        <div
          className={`h-6 w-6 rounded-full ${
            tone === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
          } dark:opacity-30`}
        />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span
        className={`text-xs font-semibold tabular-nums ${
          tone === 'income'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {amount}
      </span>
    </div>
  )
}
