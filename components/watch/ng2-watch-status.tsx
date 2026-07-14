"use client"

import { useState, useEffect } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Watch, Battery, Bluetooth, Zap, Sun, Settings, Syringe } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { WatchDetails } from "./watch-details"

export function NGWatchStatus() {
  const [battery, setBattery] = useState(85)
  const [isConnected] = useState(true)
  const [naloxoneStatus] = useState<"ready" | "low" | "empty">("ready")
  const [chargingMode] = useState<"solar" | "kinetic" | "wireless" | "usbc" | null>("solar")

  useEffect(() => {
    // Simulate battery charging
    const interval = setInterval(() => {
      if (chargingMode && battery < 100) {
        setBattery((prev) => Math.min(100, prev + 0.5))
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [chargingMode, battery])

  const getBatteryColor = () => {
    if (battery > 60) return "text-green-500"
    if (battery > 30) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center pulse-glow">
                <Watch className="w-6 h-6 text-white" />
              </div>
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center pulse-glow">
                  <Bluetooth className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold font-[family-name:var(--font-orbitron)] flex items-center gap-2">
                NARCOGUARD NG
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">AUTO-INJECT</span>
              </h3>
              {/* */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} pulse-glow`} />
                <span className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <button className="p-2 rounded-full glass hover:bg-primary/10 transition-all">
                <Settings className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl glass neon-border">
              <DialogHeader>
                <DialogTitle className="font-[family-name:var(--font-orbitron)]">NarcoGuard NG Details</DialogTitle>
              </DialogHeader>
              <WatchDetails />
            </DialogContent>
          </Dialog>
        </div>

        {/* Battery Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={`w-5 h-5 ${getBatteryColor()} ${battery < 30 ? "animate-pulse" : ""}`} />
              <span className="text-sm text-muted-foreground">Battery</span>
            </div>
            <span className={`text-2xl font-bold glow-text ${getBatteryColor()}`}>{Math.round(battery)}%</span>
          </div>
          <Progress value={battery} className="h-3 pulse-glow" />

          {/* Charging indicators */}
          {chargingMode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {chargingMode === "solar" && <Sun className="w-3 h-3 text-yellow-500 pulse-glow" />}
              {chargingMode === "kinetic" && <Zap className="w-3 h-3 text-blue-500 pulse-glow" />}
              {chargingMode === "wireless" && <Zap className="w-3 h-3 text-purple-500 pulse-glow" />}
              <span>Charging via {chargingMode}</span>
            </div>
          )}
        </div>

        {/* Naloxone Status */}
        <div className="p-4 rounded-lg glass neon-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Syringe
                className={`w-5 h-5 ${
                  naloxoneStatus === "ready"
                    ? "text-green-500"
                    : naloxoneStatus === "low"
                      ? "text-yellow-500"
                      : "text-red-500"
                } pulse-glow`}
              />
              <span className="text-sm font-medium">Auto-Injector</span>
              {/* */}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                naloxoneStatus === "ready"
                  ? "bg-green-500/20 text-green-500"
                  : naloxoneStatus === "low"
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-red-500/20 text-red-500"
              }`}
            >
              {naloxoneStatus.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {naloxoneStatus === "ready" && "Auto-injection system armed and ready for automatic deployment"}
            {naloxoneStatus === "low" && "Naloxone cartridge needs replacement soon"}
            {naloxoneStatus === "empty" && "Replace naloxone cartridge immediately - auto-injection unavailable"}
          </p>
          {/* */}
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-3 rounded-lg text-center">
            <div className="text-2xl font-bold glow-text">98</div>
            <div className="text-xs text-muted-foreground">Heart Rate</div>
          </div>
          <div className="glass p-3 rounded-lg text-center">
            <div className="text-2xl font-bold glow-text">98%</div>
            <div className="text-xs text-muted-foreground">SpO2</div>
          </div>
        </div>

        {/* Sync button */}
        <GlowButton variant="default" className="w-full">
          <Bluetooth className="w-4 h-4 mr-2" />
          Sync Watch Data
        </GlowButton>
      </div>
    </HolographicCard>
  )
}
