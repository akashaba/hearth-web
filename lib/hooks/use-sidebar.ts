'use client'

import { useEffect, useState } from 'react'

const KEY = 'hearth:sidebar-collapsed'

/**
 * Persisted sidebar collapsed state. Server-renders as `false` (expanded) to
 * avoid a hydration mismatch; the client swaps to the stored value on mount,
 * so first paint might briefly show expanded even for users who prefer
 * collapsed. Worth it to keep SSR deterministic.
 */
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY)
      if (stored === '1') setCollapsed(true)
    } catch {
      /* ignore — private mode / disabled storage */
    }
    setMounted(true)
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        window.localStorage.setItem(KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return { collapsed, toggle, mounted }
}
