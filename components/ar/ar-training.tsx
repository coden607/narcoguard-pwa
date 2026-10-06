"use client"

import { useState } from "react"
import Link from "next/link"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Camera, Play, Award, Clock, Target, CheckCircle2, X } from "lucide-react"

interface TrainingModule {
  id: string
  title: string
  description: string
  duration: string
  difficulty: "beginner" | "intermediate" | "advanced"
  steps: string[]
  guideAnchor?: string
}

const MODULES: TrainingModule[] = [
  {
    id: "naloxone-basic",
    title: "Naloxone Administration Basics",
    description: "Practice the response sequence and then open the guided naloxone walkthrough.",
    duration: "10 min",
    difficulty: "beginner",
    guideAnchor: "naloxone",
    steps: [
      "Check responsiveness and breathing.",
      "Call 911 or have someone call while you get naloxone.",
      "Give one nasal naloxone dose according to the device instructions.",
      "Support breathing/CPR as appropriate and give another dose after 2–3 minutes if there is no response.",
      "Stay with the person until EMS arrives.",
    ],
  },
  {
    id: "cpr-basics",
    title: "CPR Fundamentals",
    description: "Review basic compression and rescue-breath guidance, then use the guided CPR walkthrough.",
    duration: "15 min",
    difficulty: "beginner",
    guideAnchor: "cpr",
    steps: [
      "Confirm the scene is safe and call 911.",
      "Check breathing quickly; gasping is not normal breathing.",
      "Begin CPR if the person is not breathing normally.",
      "Use an AED if available and follow its prompts.",
      "Continue until EMS takes over or the person clearly recovers.",
    ],
  },
  {
    id: "emergency-response",
    title: "Emergency Response Protocol",
    description: "Practice the complete sequence from recognizing danger through EMS handoff.",
    duration: "20 min",
    difficulty: "intermediate",
    steps: [
      "Check scene safety before approaching.",
      "Assess responsiveness and breathing.",
      "Call 911 and send someone for naloxone/AED when available.",
      "Give naloxone when opioid overdose is possible; do not delay breathing support.",
      "Place a breathing but unresponsive person in the recovery position.",
      "Tell EMS what you observed and what care was given.",
    ],
  },
  {
    id: "advanced-scenarios",
    title: "Advanced Scenarios",
    description: "Work through harder judgment calls without replacing EMS or exceeding your training.",
    duration: "30 min",
    difficulty: "advanced",
    steps: [
      "Prioritize scene safety and call 911 early.",
      "Do not enter an unsafe scene or attempt to restrain people.",
      "If more than one person needs help, give dispatch clear information and follow instructions.",
      "Use naloxone when opioid overdose is possible and support breathing.",
      "Protect privacy: do not photograph, post, or share identifying details.",
    ],
  },
]

export function ARTraining() {
  const [selected, setSelected] = useState<TrainingModule | null>(null)
  const [completed, setCompleted] = useState<string[]>([])

  const getDifficultyColor = (difficulty: TrainingModule["difficulty"]) => {
    if (difficulty === "beginner") return "text-green-500"
    if (difficulty === "intermediate") return "text-yellow-500"
    return "text-red-500"
  }

  const markComplete = (id: string) => {
    setCompleted((current) => current.includes(id) ? current : [...current, id])
    setSelected(null)
  }

  return (
    <div className="space-y-6" id="training-modules">
      <HolographicCard className="p-6" glowIntensity="high">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-purple-500 flex items-center justify-center pulse-glow">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1"><Award className="w-6 h-6 text-secondary pulse-glow" /></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold glow-text font-orbitron">TRAINING</h2>
            <p className="text-muted-foreground">Working tutorials first; camera guidance is optional and starts only when you choose it.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-2">
          <div className="glass p-4 rounded-lg text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-primary pulse-glow" />
            <p className="text-2xl font-bold glow-text">{completed.length}/{MODULES.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-secondary pulse-glow" />
            <p className="text-2xl font-bold glow-text">75m</p>
            <p className="text-xs text-muted-foreground">Estimated total</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500 pulse-glow" />
            <p className="text-2xl font-bold glow-text">{completed.length === MODULES.length ? 1 : 0}</p>
            <p className="text-xs text-muted-foreground">Course completion</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">These tutorials are educational and do not certify clinical competence. In an emergency, call 911.</p>
      </HolographicCard>

      {selected && (
        <HolographicCard className="p-6" glowIntensity="medium">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">{selected.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
            </div>
            <button type="button" aria-label="Close tutorial" onClick={() => setSelected(null)} className="p-2 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>
          <ol className="list-decimal pl-6 space-y-3 mt-5">
            {selected.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <div className="flex flex-wrap gap-3 mt-6">
            {selected.guideAnchor && (
              <Link href="#ar-guidance">
                <GlowButton variant="default"><Camera className="w-4 h-4 mr-2" />Open guided practice</GlowButton>
              </Link>
            )}
            <GlowButton variant="success" onClick={() => markComplete(selected.id)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />I reviewed this module
            </GlowButton>
          </div>
        </HolographicCard>
      )}

      <div className="space-y-4">
        {MODULES.map((module) => {
          const done = completed.includes(module.id)
          return (
            <HolographicCard key={module.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{module.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full glass ${getDifficultyColor(module.difficulty)}`}>{module.difficulty}</span>
                    {done && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />reviewed</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{module.duration}</span></div>
                    <div className="flex items-center gap-1"><Camera className="w-3 h-3" /><span>Camera optional</span></div>
                  </div>
                </div>
                <GlowButton variant="default" onClick={() => setSelected(module)}>
                  <Play className="w-4 h-4 mr-2" />Start
                </GlowButton>
              </div>
            </HolographicCard>
          )
        })}
      </div>
    </div>
  )
}
