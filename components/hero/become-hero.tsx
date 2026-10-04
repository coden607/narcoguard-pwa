"use client"

import { useState } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Shield, Award, Heart, CheckCircle, BookOpen } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function BecomeHero() {
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [completedModules, setCompletedModules] = useState<number[]>([])

  const modules = [
    { id: 1, title: "Recognizing Overdose Signs", duration: "10 min", icon: Heart },
    { id: 2, title: "Naloxone Administration", duration: "15 min", icon: Shield },
    { id: 3, title: "CPR Basics", duration: "20 min", icon: Award },
    { id: 4, title: "Good Samaritan Laws", duration: "5 min", icon: BookOpen },
  ]

  const completeModule = (id: number) => {
    if (!completedModules.includes(id)) {
      setCompletedModules([...completedModules, id])
      setTrainingProgress(((completedModules.length + 1) / modules.length) * 100)
    }
  }

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-6">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <Shield className="w-16 h-16 text-primary pulse-glow float-animation" />
            <div className="absolute inset-0 blur-xl bg-primary/50 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold glow-text font-orbitron">BECOME A HERO</h2>
          <p className="text-muted-foreground mt-2">Join the network of trained responders saving lives</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Training Progress</span>
            <span className="text-primary font-bold">{Math.round(trainingProgress)}%</span>
          </div>
          <Progress value={trainingProgress} className="h-3 pulse-glow" />
        </div>

        {/* Training modules */}
        <div className="space-y-3">
          {modules.map((module) => {
            const isCompleted = completedModules.includes(module.id)
            const Icon = module.icon

            return (
              <div
                key={module.id}
                className={`p-4 rounded-lg glass neon-border transition-all duration-300 ${
                  isCompleted ? "bg-green-500/10" : "hover:bg-primary/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isCompleted ? "bg-green-500/20" : "bg-primary/20"}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-500 pulse-glow" />
                      ) : (
                        <Icon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{module.title}</p>
                      <p className="text-xs text-muted-foreground">{module.duration}</p>
                    </div>
                  </div>
                  {!isCompleted && (
                    <GlowButton variant="default" size="sm" onClick={() => completeModule(module.id)}>
                      Start
                    </GlowButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Certification */}
        {trainingProgress === 100 && (
          <div className="text-center space-y-4 p-6 rounded-lg glass neon-border emergency-pulse">
            <Award className="w-12 h-12 mx-auto text-secondary pulse-glow" />
            <div>
              <h3 className="text-xl font-bold text-secondary glow-text">Ready for Certification!</h3>
              <p className="text-sm text-muted-foreground mt-1">Complete the final exam to become a certified Hero</p>
            </div>
            <GlowButton variant="success" className="w-full">
              Take Certification Exam
            </GlowButton>
          </div>
        )}
      </div>
    </HolographicCard>
  )
}
