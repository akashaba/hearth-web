---
name: design-tokens
description: Consult the design system before writing or modifying any UI. Use whenever a component is being created, restyled, or a color/spacing/radius choice is being made. Prevents drift from the shared visual language between web and mobile.
---

# design-tokens

The design system lives at [docs/design/design-system.md](../../../docs/design/design-system.md). It is the source of truth for every color, radius, font size, spacing rhythm, and component pattern. **Read the section relevant to your change before writing code.**

## Non-negotiables

- **No raw hex.** If you're typing `#7c3aed`, stop — that's `violet-600`, use the Tailwind class.
- **No ad-hoc radii.** Pick from the radii table. A card is `rounded-2xl`. A pill is `rounded-full`. If you're reaching for `rounded-[14px]`, stop and pick one.
- **No unlisted colors.** Everything is a Tailwind token from the palette in the design doc. If a chart needs a 7th color and the palette only lists 6, group the tail into "Other" — do not invent a 7th.
- **`tabular-nums` on every monetary value.** Otherwise digits jitter as amounts change.
- **`dark:` variant on every color class.** Never ship a component that hasn't been checked in both themes.
- **`-` prefix on debit amounts.** Color alone is not accessible.

## Before you write a component

1. Grep `docs/design/design-system.md` for the pattern name (KPI card, transaction row, hero balance card, sidebar, chart baseline, etc.). If it's already defined, use it verbatim.
2. If it's a new pattern, propose it as an addition to the design doc **first**, then implement. Do not merge a new pattern silently.
3. If it looks similar to an existing pattern but with a small tweak, resist — either use the existing pattern as-is, or update the pattern in the design doc and refactor the existing consumers.

## Chart color mapping

Series 1 = `violet-600` (primary — usually "expense" or "actual").
Series 2 = `violet-300` (secondary — usually "income" or "projected").
Additional series follow the ramp in the design doc. Semantic overlays (savings line, deficit fill) use `emerald-500` / `rose-500`.

## Icon library

Lucide, imported from `lucide-react`. Stroke width 1.75. Nav icons 24px, inline icons 16px, category tiles 20px. Do **not** mix in Font Awesome, Heroicons, or MUI icons — the visual family must stay consistent across web and mobile.

## Mirroring in the mobile app

Any pattern implemented here also has a NativeWind counterpart in the mobile repo. If you invent a new pattern here, note it in the PR description so the mobile repo picks it up next session. Better still: mirror it yourself in the same session.
