# Hearth — Design System

Visual contract for both apps. Every component references these tokens; nothing hard-codes a hex value.

**This file is duplicated in `web/docs/design/design-system.md` and `mobile/docs/design/design-system.md`. Change one, change the other in the same session.**

Inspiration: mobile ref 2 ("Hello, Siyam Ahmed!" screen with central FAB + purple gradient balance card) and web ref 3 (FinSet purple-sidebar dashboard with 4 KPI cards, money-flow chart, budget donut).

## Principles

- **Numbers are the hero.** Big, bold, tracking-tight. A dashboard exists to answer "what's my number?" — everything else supports that.
- **Rounded, layered, soft.** Cards on cards, generous radii (16-24px), low-elevation shadows. No hard corners, no heavy strokes.
- **Purple is a single accent, not a wash.** Use it for primary actions, active nav state, hero cards, and the primary chart series. Everything else is neutral slate.
- **Light-first, dark-supported.** Design in light. Every token has a dark counterpart. Never ship a component that only looks right in one mode.
- **Whitespace over dividers.** Prefer padding + card separation over hairlines.

## Colors

Primary purple ramp uses **Tailwind's `violet`** (already available in Tailwind + NativeWind). Semantic + neutrals use Tailwind's `slate`, `emerald`, `rose`, `amber`.

### Tokens

| Role | Light | Dark |
| --- | --- | --- |
| `bg` (page) | `slate-50` | `slate-950` |
| `bg-elevated` (card) | `white` | `slate-900` |
| `bg-hero` (gradient balance) | `linear-gradient(135deg, violet-400 → violet-600)` | `linear-gradient(135deg, violet-500 → violet-700)` |
| `bg-nav-active` | `violet-600` | `violet-500` |
| `bg-fab` | `violet-600` | `violet-500` |
| `border` | `slate-200` | `slate-800` |
| `text-primary` | `slate-900` | `slate-50` |
| `text-secondary` | `slate-500` | `slate-400` |
| `text-on-purple` | `white` | `white` |
| `accent` | `violet-600` | `violet-400` |
| `positive` (income, savings +) | `emerald-600` | `emerald-400` |
| `negative` (expense, savings -) | `rose-600` | `rose-400` |
| `warning` (discrepancy) | `amber-600` | `amber-400` |

Chart series ramp (use in order): `violet-600`, `violet-300`, `slate-400`, `slate-200`, `emerald-500`, `amber-500`. If a chart needs more than 6 categories, group the tail into "Other".

## Typography

Family: `Inter` (Google Font) on web; `Inter` via `expo-google-fonts` on mobile. Weights: 400, 500, 600, 700.

| Role | Class | Use |
| --- | --- | --- |
| Hero number | `text-4xl md:text-5xl font-bold tracking-tight tabular-nums` | Balance card, big KPIs |
| KPI number | `text-2xl md:text-3xl font-semibold tabular-nums` | KPI card values |
| H1 | `text-2xl font-semibold` | Screen titles |
| H2 | `text-lg font-semibold` | Section headings |
| Body | `text-sm` | Default paragraph, table cells |
| Body-strong | `text-sm font-medium` | Transaction description |
| Caption | `text-xs text-secondary` | Timestamps, sublabels |
| Chip | `text-xs font-medium` | KPI delta, status chips |

`tabular-nums` on every monetary value — otherwise digit widths jitter as amounts change.

## Spacing

Tailwind's 4px scale. Standard rhythm:

- Between cards in a stack: `gap-4` (16px) mobile, `gap-6` (24px) web
- Card inner padding: `p-5` (20px) mobile, `p-6` (24px) web
- Between related lines inside a card: `gap-1.5` (6px)
- Section top margin: `mt-8` (32px)

Grid gutters (web): `gap-6`. KPI card row is a 4-col grid on `lg`, 2-col on `md`, stacked on `sm`.

## Radii

| Role | Class |
| --- | --- |
| Card | `rounded-2xl` (16px) |
| Hero balance card | `rounded-3xl` (24px) |
| Chip / pill / button | `rounded-full` |
| Input / small button | `rounded-lg` (8px) |
| Icon tile (category) | `rounded-xl` (12px) |

## Elevation

| Role | Web | Mobile |
| --- | --- | --- |
| Card at rest | `shadow-sm` on light, none on dark | none (rely on `bg-elevated` contrast) |
| Card hover / press | `shadow-md` | subtle opacity change |
| FAB / floating | `shadow-lg` | `shadow-lg` |
| Dialog / sheet | `shadow-xl` | native modal shadow |

Never use `shadow-2xl` — reads as loud in this design language.

## Iconography

- **Lucide** icons on web (`lucide-react`), on mobile (`lucide-react-native`). Same names, same visual family across both apps.
- Stroke width: 1.75 (default in Lucide). Do not mix stroke widths.
- Nav / tab icons: 24px. Inline within text: 16px. FAB icon: 28px. Category tiles: 20px inside a tinted circle.

Category tinted-icon pattern (used in transaction rows and category pickers):

```tsx
<div class="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
  <ShoppingCart class="h-5 w-5 text-violet-600 dark:text-violet-400" />
</div>
```

The tint color varies by category `group`:
- `income` → `emerald`
- `fixed` → `violet`
- `variable` → `slate`

## Component patterns

### KPI Card

Used in the top row of the Dashboard (web + mobile).

```
┌───────────────────────────┐
│ Total Balance          ↗  │  ← label + trend arrow (upper right)
│                           │
│  $15,700.00               │  ← hero number
│                           │
│  ↑ 12.1%  vs last month   │  ← delta chip + comparator caption
└───────────────────────────┘
```

- `bg-elevated`, `rounded-2xl`, `p-6` (web) / `p-5` (mobile)
- Label: caption + upward-diagonal arrow icon
- Value: KPI number, `text-primary`
- Delta chip: pill, `bg-emerald-50 text-emerald-700` (positive) or `bg-rose-50 text-rose-700` (negative); dark equivalents `bg-emerald-950/50 text-emerald-400`.

### Hero Balance Card (mobile)

```
┌─────────────────────────────┐
│ Current Balance         [+] │  ← label + circular add button
│                             │
│    $4,570.80                │  ← hero number, white
│                             │
└─────────────────────────────┘
```

- `bg-hero` gradient, `rounded-3xl`, `p-6`
- All text white
- The `+` button is a `rounded-full bg-white/90 text-violet-600` — the shortcut is context-aware (opens Quick Entry).

### Transaction Row

```
[avatar]  Spotify Subscription     -$4.99
          15 July 2023                >
```

- Row: `flex items-center gap-3 py-3`
- Avatar: 40px `rounded-full`; brand color if known, otherwise the group-tinted icon pattern above
- Middle: two-line stack — body-strong description, caption date
- Right: amount (`text-negative` for debit, `text-positive` for credit), then a small chevron on mobile (tap for detail)

### Bottom Nav (mobile) with central Scan FAB

5 slots: Home · Transactions · **[FAB]** · Analytics · Account. The FAB is elevated above the bar, `56px`, `bg-fab`, white scanner icon (`Scan` from Lucide). Tapping opens `/receipt/scan`. Long-press could later open a menu (Scan / Manual Entry / …) but phase 1 is scan-only.

### Sidebar (web)

Fixed left, ~240px wide. Header with product logo + name. Item = icon + label. Active item = `bg-nav-active text-white rounded-full` pill spanning the whole item row minus a 12px horizontal margin. Bottom of sidebar: theme toggle + Help + Log out.

### Chart baseline

- Web: **Recharts**. Grid = `strokeDasharray="3 3" stroke="slate-200/dark:slate-800"`. Axis text = caption color. Legend = chip style.
- Mobile: **victory-native** (Skia). Match colors and axis text style.
- Bar chart bar radius: 6px on top corners. No 3D, no gradients on bars.
- Donut: outer 8px stroke, transparent inner, center label = KPI-number-sized total.

## Dark mode strategy

- Use CSS variables driven by `class="dark"` on `<html>` (web) or `useColorScheme()` (mobile).
- Never write raw hex — always Tailwind class with `dark:` variant.
- Test every screen in both modes before shipping.

## What NOT to do

- No gradients on backgrounds other than the hero balance card and the FAB (optional). Everything else is flat.
- No purple text on white for body copy — poor readability. Purple is for accents (active state, links, highlights), not paragraphs.
- No mixed radii within one card — a rounded card containing sharp-cornered inputs looks broken.
- No amount without `tabular-nums`.
- No color as the only signifier for +/- amounts. Always prefix with `-` for debits (screen readers, colorblind users).
