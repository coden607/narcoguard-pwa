"use client"

import { useEffect, useState } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Users, MapPin } from "lucide-react"
import { HeroMap } from "./hero-map"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function HeroNetworkStatus() {
  const [onCallCount, setOnCallCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/heroes", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { onCallCount?: number }) => {
        if (!cancelled) setOnCallCount(typeof body.onCallCount === "number" ? body.onCallCount : 0)
      })
      .catch(() => { if (!cancelled) setOnCallCount(null) })
    return () => { cancelled = true }
  }, [])

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-orbitron">HERO NETWORK</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${onCallCount === null ? "bg-amber-500" : "bg-green-500"}`} />
            <span className="text-xs text-muted-foreground">{onCallCount === null ? "Status unavailable" : "Readiness network live"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Eligible On Call</span>
            </div>
            <p className="text-3xl font-bold glow-text">{onCallCount ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Current certificate + enrolled + unexpired naloxone</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-secondary pulse-glow" />
              <span className="text-xs text-muted-foreground">Nearby dispatch</span>
            </div>
            <p className="text-lg font-bold glow-text">Not live</p>
            <p className="text-[11px] text-muted-foreground mt-1">No location-based emergency matching yet</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          The readiness network can track certified volunteers who explicitly mark themselves On Call. Heroes do not replace 911, and NarcoGuard is not dispatching volunteers to emergencies yet.
        </p>

        <Dialog>
          <DialogTrigger asChild>
            <GlowButton variant="default" className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              View readiness map concept
            </GlowButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl glass neon-border">
            <DialogHeader>
              <DialogTitle className="font-orbitron">Hero Network Map</DialogTitle>
            </DialogHeader>
            <HeroMap />
          </DialogContent>
        </Dialog>
      </div>
    </HolographicCard>
  )
}
