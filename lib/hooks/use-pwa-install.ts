"use client"

import { useState, useEffect, useSyncExternalStore } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const STANDALONE_QUERY = "(display-mode: standalone)"

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const isStandalone = () => window.matchMedia(STANDALONE_QUERY).matches

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installedThisSession, setInstalledThisSession] = useState(false)
  const runningStandalone = useSyncExternalStore(subscribeToDisplayMode, isStandalone, () => false)
  const isInstalled = runningStandalone || installedThisSession
  const isInstallable = deferredPrompt !== null && !isInstalled

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstalledThisSession(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installPWA = async () => {
    if (!deferredPrompt) {
      return false
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    // A prompt can only be used once, whatever the person chose.
    setDeferredPrompt(null)
    return outcome === "accepted"
  }

  return { isInstallable, isInstalled, installPWA }
}
