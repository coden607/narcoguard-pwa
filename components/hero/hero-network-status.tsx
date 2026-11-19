"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Users, MapPin } from "lucide-react"
import { HeroMap } from "./hero-map"
import { HeroHelpRequest } from "./hero-help-request"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function HeroNetworkStatus() {
  const [networkLive, setNetworkLive] = useState(false)
  const [onCallCount, setOnCallCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/heroes", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { nearbyRequests?: boolean; onCallCount?: number | null }) => {
        if (cancelled) return
        setNetworkLive(body.nearbyRequests === true)
        setOnCallCount(typeof body.onCallCount === "number" ? body.onCallCount : null)
      })
      .catch(() => {
        if (!cancelled) {
          setNetworkLive(false)
          setOnCallCount(null)
        }
      })
    return () => { cancelled = true }
  }, [])

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-orbitron">HERO NETWORK</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${networkLive ? "bg-green-500" : "bg-amber-500"}`} />
            <span className="text-xs text-muted-foreground">{networkLive ? "Live network" : "Network not live yet"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Eligible on call</span>
            </div>
            <p className="text-3xl font-bold glow-text">{onCallCount === null ? "—" : onCallCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {onCallCount === null
                ? "On-call count unavailable until Hero enrollment is configured"
                : "Enrolled, current certificate, and unexpired naloxone. This is not a nearby dispatch."}
            </p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-secondary pulse-glow" />
              <span className="text-xs text-muted-foreground">Nearby</span>
            </div>
            <p className="text-3xl font-bold glow-text">{networkLive ? "Live" : "Off"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {networkLive ? "Nearby requests are switched on" : "Nearby dispatch is not live"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <p className="font-semibold text-primary">We need Heroes</p>
            <p className="text-sm text-muted-foreground">NarcoGuard has the Hero Network infrastructure, but real coverage depends on trained volunteers. To become a lifesaving emergency Hero, you must complete the training, pass the certification test at 100%, enroll with a current certificate, carry naloxone while on call, and explicitly turn on emergency responder mode. Practical resource help remains separate from emergency Hero status.</p>
          </div>
          <GlowButton asChild variant="default" className="w-full">
            <Link href="/hero-signup#hero-setup">
              <Users className="w-4 h-4 mr-2" />
              Earn Hero certification — start setup
            </Link>
          </GlowButton>
        </div>

        <HeroHelpRequest />

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
