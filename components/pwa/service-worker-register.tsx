"use client"

import { useEffect } from "react"

const UPDATE_INTERVAL_MS = 15 * 60 * 1000

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let timer: number | undefined
    let disposed = false

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      if (disposed) return
      // Check immediately on every app launch and periodically while the app stays open.
      // The service worker uses skipWaiting/clients.claim, so a new shell becomes active
      // automatically without forcing a reload while someone may be filling out a form.
      void registration.update().catch(() => undefined)
      timer = window.setInterval(() => {
        void registration.update().catch(() => undefined)
      }, UPDATE_INTERVAL_MS)
    }).catch((error) => {
      console.warn("NarcoGuard service worker registration failed", error)
    })

    return () => {
      disposed = true
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [])

  return null
}
