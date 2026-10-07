"use client"

import { ARGuidance } from "@/components/ar/ar-guidance"
import { ARTraining } from "@/components/ar/ar-training"
import { ParticleField } from "@/components/effects/particle-field"

export default function ARPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={100} />

      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-secondary/5 animate-pulse" />

      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="space-y-8">
          <ARGuidance />
          <ARTraining />
        </div>
      </div>
    </div>
  )
}
