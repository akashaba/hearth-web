import {
  Briefcase,
  Bus,
  Car,
  Circle,
  CircleDollarSign,
  Clapperboard,
  Coffee,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Repeat,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sofa,
  Stethoscope,
  Target,
  TrendingUp,
  Undo2,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { iconNameFor, type CategoryIconName } from '@/shared/category-icons'
import { cn } from '@/lib/utils'

const REGISTRY: Record<CategoryIconName, LucideIcon> = {
  Wallet,
  Briefcase,
  PiggyBank,
  Undo2,
  CircleDollarSign,
  Home,
  Zap,
  Wifi,
  HeartPulse,
  Car,
  Repeat,
  Landmark,
  TrendingUp,
  Target,
  ShoppingCart,
  UtensilsCrossed,
  Coffee,
  Bus,
  Wrench,
  Stethoscope,
  Shirt,
  Sofa,
  ShoppingBag,
  Clapperboard,
  Gift,
  HandHeart,
  Plane,
  GraduationCap,
  Circle,
}

type Props = {
  categoryName: string
  className?: string
  size?: number
  strokeWidth?: number
}

/**
 * Renders the lucide icon for a category name. Falls back to Circle for
 * anything unmapped (e.g. user-added categories) so the UI never breaks.
 */
export function CategoryIcon({ categoryName, className, size = 16, strokeWidth = 1.75 }: Props) {
  const Icon = REGISTRY[iconNameFor(categoryName)]
  return <Icon className={cn(className)} size={size} strokeWidth={strokeWidth} />
}
