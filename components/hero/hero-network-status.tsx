"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Users, MapPin } from "lucide-react"
import { HeroMap } from "./hero-map"
import { HeroHelpRequest } from "./hero-help-request"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function HeroNetworkStatus() {
  const heroesOnline = 0
  const nearbyHeroes = 0

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-orbitron">HERO NETWORK</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Responder + resource network</span>
          </div>
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
            <p className="text-3xl font-bold glow-text">Live</p>
            <p className="text-[11px] text-muted-foreground mt-1">When the network launch switch is enabled</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-secondary pulse-glow" />
              <span className="text-xs text-muted-foreground">Nearby</span>
            </div>
            <p className="text-3xl font-bold glow-text">Map</p>
            <p className="text-[11px] text-muted-foreground mt-1">Approximate areas only</p>
          </div>
        </div>

        <HeroHelpRequest />

        {/* View map button */}
        <Dialog>
          <DialogTrigger asChild>
            <GlowButton variant="default" className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              View live Hero & resource map
            </GlowButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl glass neon-border">
            <DialogHeader>
              <DialogTitle className="font-orbitron">Hero & Community Resource Map</DialogTitle>
            </DialogHeader>
            <HeroMap />
          </DialogContent>
        </Dialog>
      </div>
    </HolographicCard>
  )
}
