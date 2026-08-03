// Merchant name normalization. Used by:
//   - detect-recurring edge function (grouping charges into recurring series)
//   - Top merchants view (grouping transactions by merchant)
//
// Kept minimal + deterministic so both callers cluster the same way.
// Sync via /sync-shared-to-mobile if mobile ever needs it.

export function normalizeMerchant(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/#\d+/g, '') // "STARBUCKS #4823" → "STARBUCKS"
    .replace(/\b\d{6,}\b/g, '') // strip long reference numbers
    .replace(/[^A-Z0-9 &]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}
