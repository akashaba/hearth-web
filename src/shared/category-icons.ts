// Maps each seed category to a lucide icon name. Kept as a name (not a
// component) so this file works in both web (`lucide-react`) and mobile
// (`lucide-react-native`) — each app has its own resolver that turns the
// name into the platform-specific component.
//
// Icon names correspond to exports in both lucide packages.
// If a category is missing, callers fall back to `Circle`.
//
// Sync via /sync-shared-to-mobile.

export type CategoryIconName =
  | 'Wallet'
  | 'Briefcase'
  | 'PiggyBank'
  | 'Undo2'
  | 'CircleDollarSign'
  | 'Home'
  | 'Zap'
  | 'Wifi'
  | 'HeartPulse'
  | 'Car'
  | 'Repeat'
  | 'Landmark'
  | 'TrendingUp'
  | 'Target'
  | 'ShoppingCart'
  | 'UtensilsCrossed'
  | 'Coffee'
  | 'Bus'
  | 'Wrench'
  | 'Stethoscope'
  | 'Shirt'
  | 'Sofa'
  | 'ShoppingBag'
  | 'Clapperboard'
  | 'Gift'
  | 'HandHeart'
  | 'Plane'
  | 'GraduationCap'
  | 'Circle'

export const CATEGORY_ICON_MAP: Record<string, CategoryIconName> = {
  // ─── Income ───────────────────────────────────
  Salary: 'Wallet',
  Bonus: 'Briefcase',
  'Interest Income': 'PiggyBank',
  Refund: 'Undo2',
  'Other Income': 'CircleDollarSign',
  // ─── Fixed ────────────────────────────────────
  'Rent / Mortgage': 'Home',
  Utilities: 'Zap',
  'Internet / Phone': 'Wifi',
  'Health Insurance': 'HeartPulse',
  'Car Insurance': 'Car',
  Subscriptions: 'Repeat',
  'Debt Payment': 'Landmark',
  Investment: 'TrendingUp',
  'Savings Transfer': 'Target',
  // ─── Variable ─────────────────────────────────
  Groceries: 'ShoppingCart',
  Restaurants: 'UtensilsCrossed',
  Coffee: 'Coffee',
  Transportation: 'Bus',
  'Car Maintenance': 'Wrench',
  Medical: 'Stethoscope',
  Clothing: 'Shirt',
  Household: 'Sofa',
  Shopping: 'ShoppingBag',
  Entertainment: 'Clapperboard',
  Gifts: 'Gift',
  Donations: 'HandHeart',
  Travel: 'Plane',
  Education: 'GraduationCap',
  Miscellaneous: 'Circle',
}

/** Falls back to Circle if the category name isn't mapped. */
export function iconNameFor(categoryName: string): CategoryIconName {
  return CATEGORY_ICON_MAP[categoryName] ?? 'Circle'
}
