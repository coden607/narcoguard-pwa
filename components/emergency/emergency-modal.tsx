"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlowButton } from "@/components/effects/glow-button"
import { AlertTriangle, X, Phone, Users, MapPin, Siren } from "lucide-react"
import { ParticleField } from "@/components/effects/particle-field"
import { useLocation } from "@/lib/hooks/use-location"

interface EmergencyModalProps {
  open: boolean
  onClose: () => void
  onActivate: () => void
}

export function EmergencyModal({ open, onClose, onActivate }: EmergencyModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isActivated, setIsActivated] = useState(false)
  const { location, error: locationError } = useLocation(true)

  useEffect(() => {
    if (!open || countdown === null || countdown <= 0) return

    const timer = setTimeout(() => {
      if (countdown === 1) {
        onActivate()
        setIsActivated(true)
      }
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, onActivate, open])

  useEffect(() => {
    if (!open) {
      setCountdown(null)
      setIsActivated(false)
    }
  }, [open])

  const startEmergency = () => {
    setCountdown(3)
  }

  const cancelEmergency = () => {
    setCountdown(null)
    setIsActivated(false)
    onClose()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) cancelEmergency()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md glass neon-border motion-safe:emergency-pulse">
        <ParticleField count={30} color="var(--glow-emergency)" />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-[family-name:var(--font-orbitron)]">
            <AlertTriangle className="w-6 h-6 text-destructive motion-safe:animate-bounce" />
            Emergency Response
          </DialogTitle>
          <DialogDescription>
            Demonstration only. This flow does not contact 911 or confirm that an alert was received.
          </DialogDescription>
        </DialogHeader>

        {!isActivated && countdown === null && (
          <div className="space-y-6 py-4">
            <p className="text-center text-muted-foreground">This is a demonstration flow. It does not contact 911 or guarantee that anyone received an alert. Call 911 for an actual emergency. The demo will attempt to:</p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg glass">
                <div className="p-2 rounded-full bg-destructive/20">
                  <Siren className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm">Simulate a nearby-Hero alert request</p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg glass">
                <div className="p-2 rounded-full bg-destructive/20">
                  <Phone className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm">Simulate emergency-contact notification</p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg glass">
                <div className="p-2 rounded-full bg-destructive/20">
                  <MapPin className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-sm flex-1">
                  <p>Include location if permission is available</p>
                  {location && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      <span className="ml-2">±{location.accuracy.toFixed(0)}m</span>
                    </p>
                  )}
                  {locationError && <p className="text-xs text-destructive mt-1">{locationError}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg glass">
                <div className="p-2 rounded-full bg-destructive/20">
                  <Users className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm">Display naloxone location</p>
              </div>
            </div>

            <div className="flex gap-3">
              <GlowButton variant="emergency" className="flex-1" onClick={startEmergency}>
                Run Emergency Demo
              </GlowButton>
              <GlowButton variant="default" onClick={cancelEmergency} aria-label="Close emergency demo">
                <X className="w-4 h-4" />
              </GlowButton>
            </div>
          </div>
        )}

        {countdown !== null && countdown > 0 && (
          <div className="space-y-6 py-8" role="status" aria-live="polite">
            <div className="relative">
              <div className="text-center">
                <div className="text-8xl font-bold text-destructive glow-text emergency-pulse font-[family-name:var(--font-orbitron)]">
                  {countdown}
                </div>
                <p className="text-muted-foreground mt-4">Starting the demonstration...</p>
              </div>

              {/* Circular progress */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-64 h-64 -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted opacity-20"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 120}`}
                    strokeDashoffset={`${2 * Math.PI * 120 * (countdown / 3)}`}
                    className="text-destructive emergency-pulse"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
              </div>
            </div>

            <GlowButton variant="default" className="w-full" onClick={cancelEmergency}>
              Cancel
            </GlowButton>
          </div>
        )}

        {isActivated && (
          <div className="space-y-6 py-8 text-center" role="status" aria-live="polite">
            <div className="relative">
              <Siren className="w-24 h-24 mx-auto text-destructive emergency-pulse" />
              <div className="absolute inset-0 blur-2xl bg-destructive/50 animate-pulse" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-destructive glow-text font-[family-name:var(--font-orbitron)]">
                DEMO REQUEST COMPLETE
              </h3>
              <p className="text-muted-foreground mt-2">No emergency response is confirmed. Call 911 if help is needed.</p>
              {location && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg glass">
                <span className="text-sm">Hero alert: demo only</span>
                <div className="w-2 h-2 rounded-full bg-muted-foreground" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg glass">
                <span className="text-sm">Location: not confirmed</span>
                <div className="w-2 h-2 rounded-full bg-muted-foreground" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg glass">
                <span className="text-sm">Contacts: not confirmed</span>
                <div className="w-2 h-2 rounded-full bg-muted-foreground" aria-hidden="true" />
              </div>
            </div>

            <GlowButton variant="success" className="w-full" onClick={cancelEmergency}>
              Close Demo
            </GlowButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
