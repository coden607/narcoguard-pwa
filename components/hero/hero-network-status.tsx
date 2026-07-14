"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Users, MapPin, Award, Clock } from "lucide-react"
import { HeroMap } from "./hero-map"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function HeroNetworkStatus() {
  const heroesOnline = 12
  const nearbyHeroes = 3

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-[family-name:var(--font-orbitron)]">HERO NETWORK</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
            <p className="text-3xl font-bold glow-text">{heroesOnline}</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-secondary pulse-glow" />
              <span className="text-xs text-muted-foreground">Nearby</span>
            </div>
            <p className="text-3xl font-bold glow-text">{nearbyHeroes}</p>
          </div>
        </div>

        {/* Nearby heroes list */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Closest Heroes</p>

          <div className="space-y-2">
            {[
              { name: "Hero Alpha", distance: "0.3 mi", certified: true, responseTime: "2 min" },
              { name: "Hero Beta", distance: "0.5 mi", certified: true, responseTime: "3 min" },
              { name: "Hero Gamma", distance: "0.8 mi", certified: true, responseTime: "5 min" },
            ].map((hero, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg glass hover:bg-primary/5 transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center pulse-glow">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    {hero.certified && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center pulse-glow">
                        <Award className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hero.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{hero.distance}</span>
                      <Clock className="w-3 h-3 ml-1" />
                      <span>{hero.responseTime}</span>
                    </div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
              </div>
            ))}
          </div>
        </div>

        {/* View map button */}
        <Dialog>
          <DialogTrigger asChild>
            <GlowButton variant="default" className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              View Hero Map
            </GlowButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl glass neon-border">
            <DialogHeader>
              <DialogTitle className="font-[family-name:var(--font-orbitron)]">Hero Network Map</DialogTitle>
            </DialogHeader>
            <HeroMap />
          </DialogContent>
        </Dialog>
      </div>
    </HolographicCard>
  )
}
