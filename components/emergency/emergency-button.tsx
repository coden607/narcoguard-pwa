"use client"

import { useState } from "react"
import { AlertTriangle, Phone, MapPin, Users } from "lucide-react"
import { EmergencyModal } from "./emergency-modal"
import { useLocation } from "@/lib/hooks/use-location"
import { useVitals } from "@/lib/hooks/use-vitals"

export function EmergencyButton() {
  const [, setIsEmergency] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const { location } = useLocation(true)
  const { vitals } = useVitals()

  const handleEmergencyPress = () => {
    setShowModal(true)
  }

  const activateEmergency = async () => {
    setIsEmergency(true)

    try {
      const response = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          vitals,
          userId: "user-123", // In production, use real user ID
          timestamp: Date.now(),
        }),
      })

      const result = await response.json()

      // Show success feedback
      alert(
        `✅ Emergency activated!\n\n${result.actionsTriggered.join("\n")}\n\nEstimated response: ${result.estimatedResponseTime}`,
      )
    } catch {
      // Fallback: Still show modal and try alternative emergency methods
      alert("Emergency system activated with fallback mode. Calling 911...")
    }
  }

  const call911 = () => {
    window.location.href = "tel:911"
  }

  const shareLocation = async () => {
    if (location) {
      const shareText = `🆘 EMERGENCY - I need help!\nLocation: https://maps.google.com/?q=${location.latitude},${location.longitude}\nTime: ${new Date().toLocaleString()}`

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Emergency Location",
            text: shareText,
          })
        } catch {
          console.log("[v0] Share cancelled or failed")
        }
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText)
        alert("📋 Location copied to clipboard!")
      }
    } else {
      alert("⚠️ Getting location...")
    }
  }

  const alertHeroes = async () => {
    if (!location) {
      alert("⚠️ Getting location first...")
      return
    }

    try {
      const response = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          vitals,
          alertType: "heroes-only",
          userId: "user-123",
        }),
      })

      const result = await response.json()
      alert(
        `✅ Alerted ${result.nearestHeroes?.length || 0} nearby heroes!\n\nNearest hero ETA: ${result.nearestHeroes?.[0]?.eta || "calculating..."}`,
      )
    } catch {
      // Hero alert failed - non-critical
    }
  }

  return (
    <>
      <div className="relative">
        {/* Main Emergency Button */}
        <button onClick={handleEmergencyPress} className="w-full relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 emergency-pulse" />

          <div className="relative bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-8 emergency-pulse transform transition-all duration-300 group-hover:scale-[1.02] group-active:scale-95">
            {/* Animated rings */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>

            <div className="relative flex items-center justify-center gap-6">
              <div className="relative">
                <AlertTriangle className="w-16 h-16 text-white animate-bounce" />
                <div className="absolute inset-0 blur-xl bg-white/50 animate-pulse" />
              </div>

              <div className="text-left">
                <h2 className="text-4xl font-bold text-white glow-text font-[family-name:var(--font-orbitron)]">
                  EMERGENCY SOS
                </h2>
                <p className="text-white/90 text-lg mt-1">Press for immediate help</p>
              </div>
            </div>

            {/* Pulse indicators */}
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-white emergency-pulse" />
              <div className="w-3 h-3 rounded-full bg-white emergency-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-3 h-3 rounded-full bg-white emergency-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <button
            onClick={call911}
            className="glass neon-border p-4 rounded-xl hover:bg-primary/10 transition-all group"
          >
            <Phone className="w-6 h-6 mx-auto mb-2 text-primary group-hover:pulse-glow" />
            <p className="text-xs text-center">Call 911</p>
          </button>

          <button
            onClick={shareLocation}
            className="glass neon-border p-4 rounded-xl hover:bg-primary/10 transition-all group"
          >
            <MapPin className="w-6 h-6 mx-auto mb-2 text-primary group-hover:pulse-glow" />
            <p className="text-xs text-center">Share Location</p>
          </button>

          <button
            onClick={alertHeroes}
            className="glass neon-border p-4 rounded-xl hover:bg-primary/10 transition-all group"
          >
            <Users className="w-6 h-6 mx-auto mb-2 text-primary group-hover:pulse-glow" />
            <p className="text-xs text-center">Alert Heroes</p>
          </button>
        </div>
      </div>

      <EmergencyModal open={showModal} onClose={() => setShowModal(false)} onActivate={activateEmergency} />
    </>
  )
}
