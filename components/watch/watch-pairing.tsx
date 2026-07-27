"use client"

import { useState } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Watch, Bluetooth, CheckCircle, Loader2 } from "lucide-react"

export function WatchPairing() {
  const [isPairing, setIsPairing] = useState(false)
  const [isPaired, setIsPaired] = useState(false)

  const startPairing = () => {
    setIsPairing(true)
    setTimeout(() => {
      setIsPairing(false)
      setIsPaired(true)
    }, 3000)
  }

  return (
    <HolographicCard className="p-8 text-center" glowIntensity="high">
      <div className="space-y-6">
        {!isPaired && !isPairing && (
          <>
            <div className="relative inline-block">
              <Watch className="w-24 h-24 text-primary pulse-glow float-animation" />
              <div className="absolute inset-0 blur-2xl bg-primary/50 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold glow-text font-[family-name:var(--font-orbitron)]">PAIR NG WATCH</h2>
              <p className="text-muted-foreground mt-2">
                Connect your NG smartwatch to enable vital monitoring and emergency features
              </p>
            </div>
            <GlowButton onClick={startPairing} className="w-full" size="lg">
              <Bluetooth className="w-5 h-5 mr-2" />
              Start Pairing
            </GlowButton>
          </>
        )}

        {isPairing && (
          <>
            <div className="relative inline-block">
              <Loader2 className="w-24 h-24 text-primary pulse-glow animate-spin" />
              <div className="absolute inset-0 blur-2xl bg-primary/50 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold glow-text font-[family-name:var(--font-orbitron)]">SEARCHING...</h2>
              <p className="text-muted-foreground mt-2">Looking for nearby NG devices</p>
            </div>
          </>
        )}

        {isPaired && (
          <>
            <div className="relative inline-block">
              <CheckCircle className="w-24 h-24 text-green-500 pulse-glow" />
              <div className="absolute inset-0 blur-2xl bg-green-500/50 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-500 glow-text font-[family-name:var(--font-orbitron)]">
                PAIRED SUCCESSFULLY
              </h2>
              <p className="text-muted-foreground mt-2">Your NG watch is now connected and monitoring your vitals</p>
            </div>
            <GlowButton variant="success" className="w-full" size="lg">
              Continue to Dashboard
            </GlowButton>
          </>
        )}
      </div>
    </HolographicCard>
  )
}
