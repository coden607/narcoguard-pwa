"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Award, BookOpen, CheckCircle, Clock } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { Button } from "@/components/ui/button"
import { GUIDE_SOURCES, GUIDES_REVIEWED, LESSONS, LESSON_PROGRESS_KEY, parseProgress } from "@/lib/response-guides"
import { SourceList } from "@/components/common/source-list"

// Self-paced lessons. Progress is kept on this device only. The practice question checks
// understanding; certification is the Hero test, graded on NarcoGuard's server.

const listeners = new Set<() => void>()
let memory: string | null = null
const readRaw = () => {
  try {
    return localStorage.getItem(LESSON_PROGRESS_KEY)
  } catch {
    return memory
  }
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const saveDone = (ids: string[]) => {
  const raw = JSON.stringify(ids)
  try {
    localStorage.setItem(LESSON_PROGRESS_KEY, raw)
  } catch {
    memory = raw
  }
  listeners.forEach((listener) => listener())
}

export function ARTraining() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  const done = parseProgress(raw)
  const [open, setOpen] = useState<string | null>(null)
  const [choice, setChoice] = useState<number | null>(null)
  const totalMinutes = LESSONS.reduce((sum, lesson) => sum + lesson.minutes, 0)

  const toggle = (id: string) => {
    setChoice(null)
    setOpen(open === id ? null : id)
  }

  return (
    <div className="space-y-6" id="training-modules" data-testid="lessons">
      <HolographicCard className="p-6" glowIntensity="high">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-purple-500 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold glow-text font-orbitron">LESSONS</h2>
            <p className="text-muted-foreground">Short lessons, each with a practice question. Progress stays on this device.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="glass p-4 rounded-lg text-center">
            <p className="text-2xl font-bold glow-text" data-testid="lessons-done">{done.length}/{LESSONS.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <p className="text-2xl font-bold glow-text">{totalMinutes}m</p>
            <p className="text-xs text-muted-foreground">Total time</p>
          </div>
          <Link href="/hero-signup" className="glass p-4 rounded-lg text-center hover:bg-primary/10">
            <Award className="w-6 h-6 mx-auto text-yellow-500" aria-hidden="true" />
            <p className="text-xs text-muted-foreground mt-1">Take the Hero test</p>
          </Link>
        </div>
      </HolographicCard>

      <ul className="space-y-4">
        {LESSONS.map((lesson) => {
          const isDone = done.includes(lesson.id)
          const isOpen = open === lesson.id
          const answered = isOpen && choice !== null
          const correct = answered && choice === lesson.check.answer
          return (
            <li key={lesson.id}>
              <HolographicCard className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {isDone && <CheckCircle className="h-5 w-5 text-green-500" aria-label="Completed" />}
                      {lesson.title}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" aria-hidden="true" />{lesson.minutes} min</p>
                  </div>
                  <Button type="button" variant={isOpen ? "outline" : "default"} aria-expanded={isOpen} onClick={() => toggle(lesson.id)}>
                    {isOpen ? "Close" : isDone ? "Review" : "Start"}
                  </Button>
                </div>
                {isOpen && (
                  <div className="mt-4 space-y-4">
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {lesson.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                    <fieldset className="space-y-2">
                      <legend className="font-medium">Practice: {lesson.check.question}</legend>
                      {lesson.check.options.map((option, optionIndex) => (
                        <label key={option} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${choice === optionIndex ? "border-primary" : ""}`}>
                          <input type="radio" name={`check-${lesson.id}`} checked={choice === optionIndex} onChange={() => setChoice(optionIndex)} className="mt-1" />
                          {option}
                        </label>
                      ))}
                    </fieldset>
                    {answered && (
                      <p className={`text-sm ${correct ? "text-green-400" : "text-amber-300"}`} role="status">
                        {correct ? "Correct. " : "Not quite. "}{lesson.check.why}
                      </p>
                    )}
                    {correct && !isDone && (
                      <Button type="button" onClick={() => { saveDone([...done, lesson.id]); setOpen(null); setChoice(null) }}>Mark lesson complete</Button>
                    )}
                  </div>
                )}
              </HolographicCard>
            </li>
          )
        })}
      </ul>

      <p className="text-sm text-muted-foreground">
        Hands-on CPR and naloxone classes from a local health department or the Red Cross are strongly recommended. Lessons are general information, not medical advice.
      </p>
      <SourceList sources={GUIDE_SOURCES} reviewed={GUIDES_REVIEWED} testId="lesson-sources" />
      {done.length > 0 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => saveDone([])}>Reset lesson progress</Button>
      )}
    </div>
  )
}
