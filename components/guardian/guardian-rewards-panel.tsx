"use client"

import { Sparkles, Trophy } from "lucide-react"
import { guardianRewardSummary } from "@/lib/guardian-rewards"
import type { GuardianState } from "@/lib/guardian-stability"

export function GuardianRewardsPanel({
  state,
  onChange,
}: {
  state: GuardianState
  onChange: (next: GuardianState) => void
}) {
  const summary = guardianRewardSummary(state)
  const remaining = Math.max(0, summary.nextMilestone - summary.points)

  return <section className="rounded-xl border border-primary/25 p-5 space-y-4" data-testid="guardian-rewards">
    <div className="flex items-start gap-3">
      <Trophy className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Momentum rewards</h2>
        <p className="text-sm text-muted-foreground">
          Optional local encouragement for actions you control. Points have no cash value and are never based on whether you are “good,” abstinent, or predicted to relapse.
        </p>
      </div>
    </div>

    <label className="flex items-start gap-3 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={state.rewardEnabled}
        disabled={state.paused}
        onChange={(event) => onChange({ ...state, rewardEnabled: event.target.checked })}
      />
      <span>
        <strong>Show my momentum points and milestones.</strong>
        <span className="block text-xs text-muted-foreground">Derived locally from check-ins, meal logs, and completed plan steps. Nothing is uploaded by this feature.</span>
      </span>
    </label>

    {state.rewardEnabled && <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border p-4">
        <p className="text-3xl font-bold">{summary.points}</p>
        <p className="text-sm text-muted-foreground">Momentum points</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-3xl font-bold">{summary.completedPlans}</p>
        <p className="text-sm text-muted-foreground">Completed planned steps</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-3xl font-bold">{summary.checkInDays}</p>
        <p className="text-sm text-muted-foreground">Voluntary check-in days</p>
      </div>
      <div className="sm:col-span-3 rounded-lg border p-4 flex gap-3 items-start">
        <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">
            {summary.milestone > 0 ? "Latest milestone: " + summary.milestone + " points" : "First milestone: 25 points"}
          </p>
          <p className="text-sm text-muted-foreground">
            {remaining > 0 ? remaining + " more points to the next local milestone." : "Keep using the planner in whatever way is useful to you."}
            {" "}There are no streak penalties or resets for missed days.
          </p>
        </div>
      </div>
    </div>}
  </section>
}
