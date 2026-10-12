"use client"

import { useEffect, useMemo, useState } from "react"
import { BrainCircuit, Bell, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  activeLearnedEvents,
  learnedEventLabel,
  learnedNeedSuggestions,
  neuralPatternScore,
  transitionInsights,
} from "@/lib/adaptive-guardian"
import { NEEDS, type CheckIn, type GuardianState, type Need } from "@/lib/guardian-stability"

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

const LAST_ALERT_KEY = "narcoguard_pattern_alert_last_v1"

async function showGenericPatternNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification("NarcoGuard check-in", {
    body: "A personal pattern you chose to watch showed up. Open Guardian Stability to review your next-step options.",
    tag: "narcoguard-pattern-alert",
    data: { url: "/stability" },
  })
}

export function AdaptiveGuardianPanel({
  state,
  today,
  onChange,
}: {
  state: GuardianState
  today: CheckIn
  onChange: (next: GuardianState) => void
}) {
  const [notificationNote, setNotificationNote] = useState("")
  const transitions = useMemo(
    () => state.adaptiveLearningEnabled ? transitionInsights(state.entries).slice(0, 8) : [],
    [state.adaptiveLearningEnabled, state.entries],
  )
  const neural = useMemo(
    () => state.adaptiveLearningEnabled ? neuralPatternScore(state.entries, today) : null,
    [state.adaptiveLearningEnabled, state.entries, today],
  )
  const suggestions = useMemo(
    () => state.adaptiveLearningEnabled && state.patternAlertsEnabled
      ? learnedNeedSuggestions(state.entries, today, state.alertNeeds)
      : [],
    [state.adaptiveLearningEnabled, state.patternAlertsEnabled, state.alertNeeds, state.entries, today],
  )
  const activeEvents = useMemo(() => activeLearnedEvents(today), [today])

  useEffect(() => {
    if (!state.patternAlertsEnabled || suggestions.length === 0) return
    const signature = `${today.date}:${suggestions.map((row) => row.need).sort().join(",")}`
    if (window.localStorage.getItem(LAST_ALERT_KEY) === signature) return
    window.localStorage.setItem(LAST_ALERT_KEY, signature)
    void showGenericPatternNotification()
  }, [state.patternAlertsEnabled, suggestions, today.date])

  const setLearning = (enabled: boolean) => {
    onChange({
      ...state,
      adaptiveLearningEnabled: enabled,
      patternAlertsEnabled: enabled ? state.patternAlertsEnabled : false,
    })
  }

  const setPatternAlerts = async (enabled: boolean) => {
    if (enabled && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission()
      setNotificationNote(permission === "granted"
        ? "Generic local pattern notifications are enabled on this device."
        : "Notification permission was not granted. In-app pattern notices will still work.")
    }
    onChange({ ...state, patternAlertsEnabled: enabled })
  }

  const toggleNeed = (need: Need) => {
    const alertNeeds = state.alertNeeds.includes(need)
      ? state.alertNeeds.filter((item) => item !== need)
      : [...state.alertNeeds, need]
    onChange({ ...state, alertNeeds })
  }

  return <section className="rounded-xl border border-primary/25 p-5 space-y-5" data-testid="adaptive-guardian">
    <div className="flex items-start gap-3">
      <BrainCircuit className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Adaptive Guardian learning</h2>
        <p className="text-sm text-muted-foreground">
          Optional, local-first learning from check-ins you choose to record. NarcoGuard learns descriptive personal sequences and can surface resources earlier. Unknown answers stay unknown.
        </p>
      </div>
    </div>

    <label className="flex items-start gap-3 rounded-lg border p-3">
      <input type="checkbox" checked={state.adaptiveLearningEnabled} disabled={state.paused} onChange={(event) => setLearning(event.target.checked)} />
      <span>
        <strong>Learn from my own history on this device.</strong>
        <span className="block text-xs text-muted-foreground">No personal training history is uploaded by this feature. Erasing Guardian data erases the learning history.</span>
      </span>
    </label>

    {state.adaptiveLearningEnabled && <>
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">Optional outcome label</h3>
        <p className="text-sm text-muted-foreground">
          Recording whether a return-to-use event happened gives the experimental model a label to learn from. Leave this unknown whenever you do not want to answer.
        </p>
        <label className="block text-sm">Return-to-use event today
          <select
            aria-label="Return-to-use event"
            disabled={state.paused}
            className="mt-1 block w-full max-w-sm rounded border bg-background p-2"
            value={today.returnToUse === undefined ? "" : today.returnToUse ? "yes" : "no"}
            onChange={(event) => {
              const value = event.target.value
              const entry = { ...today, returnToUse: value === "" ? undefined : value === "yes" }
              onChange({ ...state, entries: [...state.entries.filter((item) => item.date !== today.date), entry] })
            }}
          >
            <option value="">Unknown / prefer not to answer</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h3 className="font-semibold">Predetermined pattern alerts</h3></div>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={state.patternAlertsEnabled} disabled={state.paused} onChange={(event) => void setPatternAlerts(event.target.checked)} />
          <span className="text-sm">Alert me when a pattern I chose to watch appears in my current check-in.</span>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Needs I want NarcoGuard to watch and source early</legend>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {NEEDS.map((need) => <label key={need} className="flex items-center gap-2 rounded border p-2 text-sm">
              <input type="checkbox" disabled={state.paused} checked={state.alertNeeds.includes(need)} onChange={() => toggleNeed(need)} />
              {names[need]}
            </label>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">If none are selected, all learned needs are eligible for an in-app suggestion. Notifications use generic lock-screen text.</p>
        </fieldset>
        {notificationNote && <p className="text-xs" role="status">{notificationNote}</p>}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">What your history has actually shown</h3>
        {transitions.length === 0
          ? <p className="text-sm text-muted-foreground">Not enough comparable transitions yet. A pattern needs at least 5 comparable next-check-ins before it is shown.</p>
          : <ul className="space-y-2 text-sm">
              {transitions.map((row) => <li key={`${row.from}->${row.to}`} className="rounded border p-3">
                <strong>{learnedEventLabel(row.from)}</strong> → {learnedEventLabel(row.to)}
                <span className="block text-muted-foreground">Observed on the next recorded check-in {row.observed} of {row.comparable} comparable times ({row.percent}%). This is a historical observation, not proof that one event caused the other.</span>
              </li>)}
            </ul>}
      </div>

      {suggestions.length > 0 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <h3 className="font-semibold">Early resource suggestions from your own patterns</h3>
        {suggestions.map((row) => <p key={row.need} className="text-sm">
          <strong>{names[row.need]}:</strong> after {learnedEventLabel(row.from)}, this need appeared on the next recorded check-in {row.observed} of {row.comparable} times ({row.percent}%). NarcoGuard will include {names[row.need].toLowerCase()} resources below.
        </p>)}
      </div>}

      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Experimental neural layer</h3></div>
        {neural?.status === "ready" ? <>
          <p className="text-3xl font-bold">{neural.score}/100 <span className="text-sm font-normal text-muted-foreground">personal pattern score</span></p>
          <p className="text-sm text-muted-foreground">{neural.note}</p>
          <p className="text-xs text-muted-foreground">Training set on this device: {neural.labeledDays} labeled days ({neural.positiveDays} return-to-use, {neural.negativeDays} no-return-to-use).</p>
        </> : neural ? <>
          <p className="text-sm">Neural layer abstaining.</p>
          <p className="text-xs text-muted-foreground">{neural.note}</p>
          <p className="text-xs text-muted-foreground">Current voluntary labels: {neural.labeledDays} days ({neural.positiveDays} return-to-use, {neural.negativeDays} no-return-to-use).</p>
        </> : null}
        <p className="text-xs text-muted-foreground">The neural output is intentionally not displayed as “chance of relapse.” It is not clinically calibrated and never contacts a Hero, friend, clinician, or emergency service by itself.</p>
      </div>

      {activeEvents.length > 0 && <p className="text-xs text-muted-foreground">Current voluntary signals used for local matching: {activeEvents.map(learnedEventLabel).join("; ")}.</p>}
    </>}
  </section>
}
