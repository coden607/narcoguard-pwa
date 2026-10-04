"use client"

import { useState, useEffect } from "react"
import { usePWAInstall } from "@/lib/hooks/use-pwa-install"
import { Button } from "@/components/ui/button"
import { X, Download, Check } from "lucide-react"

export function InstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall()
  const [showPrompt, setShowPrompt] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    setInstalling(true)
    const success = await installPWA()
    setInstalling(false)
    if (success) {
      setShowPrompt(false)
    }
  }

  if (!showPrompt || isInstalled || !isInstallable) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-linear-to-br from-background/95 via-background/98 to-background/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse-glow" />

        <button
          onClick={() => setShowPrompt(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent animate-float">
              <Download className="h-7 w-7 text-primary-foreground" />
            </div>

            <div className="flex-1">
              <h3 className="font-orbitron text-lg font-bold text-foreground mb-1">Install NarcoGuard</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get instant access to life-saving features offline. One tap installation.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 h-12 bg-linear-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold rounded-xl transition-all hover:scale-105"
            >
              {installing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Install App
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowPrompt(false)}
              variant="outline"
              className="h-12 px-6 rounded-xl border-2 hover:bg-muted/50"
            >
              Later
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-primary" />
            <span>Works offline</span>
            <span>•</span>
            <Check className="h-3 w-3 text-primary" />
            <span>Fast & secure</span>
            <span>•</span>
            <Check className="h-3 w-3 text-primary" />
            <span>No app store needed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
