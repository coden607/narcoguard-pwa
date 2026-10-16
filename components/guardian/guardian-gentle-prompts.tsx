"use client"

import { BellRing } from "lucide-react"
import {
  PROMPT_CATEGORIES,
  type CheckIn,
  type GuardianState,
  type PromptCategory,
} from "@/lib/guardian-stability"
import { gentlePrompts } from "@/lib/guardian-prompts"

const labels: Record<PromptCategory, string> = {
  food: "Food",
  sleep: "Sleep",
  hygiene: "Hygiene",
  appointments: "Appointments",
  connection: "Connection",
  resources: "Resource follow-through",
}

export function GuardianGentlePrompts({
  state,
  today,
  now,
  onChange,
}: {
  state: GuardianState
  today: CheckIn
  now: { date: string; time: string }
  onChange: (next: GuardianState) => void
}) {
  const prompts = gentlePrompts(state, today, now)

  const updateWindow = (
    category: PromptCategory,
    patch: Partial<{ enabled: boolean; start: string; end: string }>,
  ) => {
    onChange({
      ...state,
      promptWindows: state.promptWindows.map((window) =>
        window.category === category ? { ...window, ...patch } : window,
      ),
    })
  }

  return <section className="rounded-xl border p-5 space-y-4" data-testid="gentle-prompts">
    <div className="flex items-start gap-3">
      <BellRing className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Gentle prompt windows</h2>
        <p className="text-sm text-muted-foreground">
          Choose when NarcoGuard may show a reminder inside this page. All categories start off. These are not push notifications, alarms, compliance checks, or penalties.
        </p>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {PROMPT_CATEGORIES.map((category) => {
        const window = state.promptWindows.find((item) => item.category === category)
        if (!window) return null
        return <fieldset key={category} className="rounded border p-3 space-y-2">
          <legend className="font-medium">{labels[category]}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={window.enabled}
              disabled={state.paused}
              onChange={(event) => updateWindow(category, { enabled: event.target.checked })}
            />
            Show a gentle on-page prompt
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">From
              <input
                aria-label={labels[category] + " prompt start"}
                type="time"
                value={window.start}
                disabled={state.paused || !window.enabled}
                onChange={(event) => updateWindow(category, { start: event.target.value })}
                className="mt-1 block w-full rounded border bg-background p-2"
              />
            </label>
            <label className="text-xs">Until
              <input
                aria-label={labels[category] + " prompt end"}
                type="time"
                value={window.end}
                disabled={state.paused || !window.enabled}
                onChange={(event) => updateWindow(category, { end: event.target.value })}
                className="mt-1 block w-full rounded border bg-background p-2"
              />
            </label>
          </div>
        </fieldset>
      })}
    </div>

    <div className="space-y-3" aria-live="polite">
      <h3 className="font-semibold">Prompts for right now</h3>
      {prompts.length === 0 ? <p className="text-sm text-muted-foreground">
        No enabled prompt window has a relevant suggestion right now.
      </p> : prompts.map((prompt) => <article key={prompt.category} className="rounded border p-3">
        <strong>{prompt.title}</strong>
        <p className="text-sm">{prompt.detail}</p>
        <p className="mt-1 text-xs text-muted-foreground">{prompt.reason}</p>
      </article>)}
    </div>

    <p className="text-xs text-muted-foreground">
      NarcoGuard does not notify another person, deduct points, mark you noncompliant, or treat an unanswered check-in as a failure. You can disable any window or pause Guardian at any time.
    </p>
  </section>
}
