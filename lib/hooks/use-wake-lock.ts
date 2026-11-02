"use client"

import { useEffect, useState } from "react"
import { releaseScreenWakeLock, requestScreenWakeLock, wakeLockSupported, type WakeLockNavigator, type WakeLockSentinelLike } from "@/lib/wake-lock"

/**
 * Keeps the screen awake while `active` is true. Browsers drop the lock when the tab is hidden,
 * so it is asked for again when the page becomes visible. Returns whether a lock is held, so a
 * screen can show a quiet "screen stays on" hint; nothing depends on it.
 */
export function useWakeLock(active: boolean): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const nav = (typeof navigator === "undefined" ? undefined : navigator) as WakeLockNavigator | undefined
    if (!active || !wakeLockSupported(nav)) return
    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return
      const next = await requestScreenWakeLock(nav)
      if (cancelled) {
        await releaseScreenWakeLock(next)
        return
      }
      sentinel = next
      setHeld(Boolean(next))
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire()
      else setHeld(false)
    }

    void acquire()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibility)
      void releaseScreenWakeLock(sentinel)
      setHeld(false)
    }
  }, [active])

  return held
}
