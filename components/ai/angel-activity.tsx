"use client"

import { CheckCircle2, CircleDot, OctagonX, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AngelActivityStep } from "@/lib/angel-activity"

const ICONS = { active: CircleDot, done: CheckCircle2, stopped: OctagonX, failed: TriangleAlert } as const
const STATE_TEXT = { active: "in progress", done: "done", stopped: "stopped", failed: "not completed" } as const

/** A compact live log of Angel's current request, with a Stop button while it is running. */
export function AngelActivity({ steps, running, onStop }: { steps: AngelActivityStep[]; running: boolean; onStop: () => void }) {
  if (steps.length === 0) return null
  return (
    <section className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm" aria-label="What Angel is doing" data-testid="angel-activity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">{running ? "Angel is working" : "Last request"}</h4>
        {running && (
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onStop} data-testid="angel-activity-stop">
            <OctagonX className="mr-2 h-4 w-4" aria-hidden="true" />Stop
          </Button>
        )}
      </div>
      <ol className="mt-2 space-y-1" role="status" aria-live="polite">
        {steps.map((step) => {
          const Icon = ICONS[step.state]
          return (
            <li key={step.id} className="flex items-start gap-2 break-words">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{step.label}<span className="sr-only"> ({STATE_TEXT[step.state]})</span></span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
