'use client'

import { useEffect, useState } from 'react'

// Tiny shared store (hand-rolled subscribe/publish) so the hamburger in
// <TopBar/> can open the drawer that lives in <Sidebar/>. Kept out of React
// context to avoid re-rendering the whole app on toggle.

let value = false
const listeners = new Set<() => void>()

function set(v: boolean) {
  if (value === v) return
  value = v
  listeners.forEach((l) => l())
}

export function useMobileSidebar() {
  const [open, setLocal] = useState(value)
  useEffect(() => {
    const l = () => setLocal(value)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return {
    open,
    setOpen: set,
    toggle: () => set(!value),
  }
}
