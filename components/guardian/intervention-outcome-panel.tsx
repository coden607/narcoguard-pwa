"use client"

import { Lightbulb } from "lucide-react"
import { interventionOutcomeInsights } from "@/lib/intervention-outcomes"
import type { GuardianState, Need } from "@/lib/guardian-stability"

const names: Record<Need, string> = {
  food: "Food",
  water: "Water",
  sleep: "Sleep",
  hygiene: "Shower / hygiene",
  laundry: "Laundry",
  safePlace: "Safe place",
  connection: "Connection",
  treatment: "Treatment support",
}

export function InterventionOutcomePanel({ state }: { state: GuardianState }) {
  const insights = interventionOutcomeInsights(state.entries, state.plan)

  return <section className="rounded-xl border border-primary/25 p-5 space-y-4" data-testid="intervention-outcomes">
    <div className="flex items-start gap-3">
      <Lightbulb className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">What followed your chosen support steps</h2>
        <p className="text-sm text-muted-foreground">
          NarcoGuard can locally compare completed, need-tagged plan steps with your next answered check-in for that need. Unknown answers are excluded. These are personal historical observations, not proof that a step caused an outcome.
        </p>
      </div>
    </div>

    {insights.length === 0 ? <p className="text-sm text-muted-foreground">
      Abstaining for now. The same completed support step needs at least 3 comparable next check-ins before NarcoGuard shows an outcome pattern.
    </p> : <ul className="space-y-2">
      {insights.slice(0, 8).map((row) => <li key={`${row.need}:${row.title}`} className="rounded-lg border p-3">
        <strong>{row.title}</strong>
        <span className="block text-sm">{names[row.need]} was marked met on the next answered check-in {row.followedByMet} of {row.comparable} comparable times ({row.percent}%).</span>
        <span className="block text-xs text-muted-foreground">This describes your recorded sequence only; it does not establish effectiveness or causation.</span>
      </li>)}
    </ul>}
  </section>
}
