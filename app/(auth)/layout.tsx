import Link from 'next/link'
import { ArrowLeft, BarChart3, ShieldCheck, TrendingUp, Wallet } from 'lucide-react'
// Wallet is still referenced by the Perk row (not the brand mark).

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ─── Left: promotional panel ─────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />

        {/* Top: logo + back home */}
        <div className="relative flex items-start justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-192.png"
              alt="Hearth"
              className="h-8 w-8 rounded-lg ring-1 ring-white/20"
              width={32}
              height={32}
            />
            <span className="text-base font-semibold tracking-tight">Hearth</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} /> Back home
          </Link>
        </div>

        {/* Middle: pitch + mock preview */}
        <div className="relative">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Personal finance, done right
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Take control of your money — one clear view.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-emerald-100">
            Track spending, forecast cashflow, pay off debt faster, and get straight answers from
            an AI assistant that knows your numbers.
          </p>

          {/* Mock dashboard card */}
          <div className="mt-10 max-w-md rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-100">
                  Current balance
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">$12,847.32</div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
                <TrendingUp className="h-3 w-3" strokeWidth={2.5} /> +12% MoM
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Income" value="$5,240" />
              <MiniStat label="Spent" value="$2,190" />
              <MiniStat label="Saved" value="$3,050" />
            </div>
          </div>
        </div>

        {/* Bottom: reassurance */}
        <div className="relative flex flex-wrap items-center gap-6 text-xs text-emerald-100">
          <Perk icon={ShieldCheck}>Row-level security</Perk>
          <Perk icon={BarChart3}>90-day forecast</Perk>
          <Perk icon={Wallet}>Free forever</Perk>
        </div>
      </aside>

      {/* ─── Right: Clerk form ───────────────────────────────── */}
      <main className="relative flex items-center justify-center bg-white px-6 py-12 dark:bg-slate-950 lg:px-12">
        <Link
          href="/"
          className="absolute left-6 top-6 flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 lg:hidden dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2} /> Home
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
      <div className="text-[9px] uppercase tracking-wider text-emerald-100">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Perk({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {children}
    </span>
  )
}
