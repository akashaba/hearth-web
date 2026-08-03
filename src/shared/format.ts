export function formatMoney(
  n: number | null | undefined,
  opts: { compact?: boolean; showSign?: boolean } = {},
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: opts.compact ? 'compact' : 'standard',
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: 2,
  })
  const sign = opts.showSign && n > 0 ? '+' : ''
  return sign + formatter.format(n)
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

export function formatDate(iso: string | Date, opts: { long?: boolean } = {}): string {
  const d = typeof iso === 'string' ? new Date(iso + (iso.includes('T') ? '' : 'T00:00:00')) : iso
  return d.toLocaleDateString(
    'en-US',
    opts.long
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' },
  )
}

export function toISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1))
}

export function endOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0))
}
