// The small "what Angel is doing" log shown while a message is answered (issue #244).
// Steps describe only what NarcoGuard itself knows: the request phase, the elapsed time and, once a reply
// arrives, which directory searches ran and how many listings each returned. Steps never include the
// message text, a ZIP code, coordinates or a place's address, so the log is safe to show and read aloud.
import type { AngelResources } from "@/lib/angel-resources"

export type AngelActivityPhase = "waiting" | "done" | "stopped" | "failed"
export type AngelStepState = "active" | "done" | "stopped" | "failed"

export interface AngelActivityStep {
  id: string
  label: string
  state: AngelStepState
}

export interface AngelActivityInput {
  phase: AngelActivityPhase
  /** Whether this turn asked for nearby places, so a directory search may run before the reply. */
  maySearch: boolean
  elapsedSeconds: number
  resources?: AngelResources
}

export function formatSeconds(value: number): string {
  const whole = Math.max(0, Math.floor(value))
  return `${whole} second${whole === 1 ? "" : "s"}`
}

/** One line per directory search in the reply: the need and the count, or that it was not available. */
export function searchStepLabels(resources: AngelResources | undefined): string[] {
  if (!resources) return []
  return resources.groups.map((group) => {
    if (group.status !== "ok") return `${group.shortLabel}: search not available right now`
    const count = group.results.length
    const found = count === 0 ? "no listing found" : `${count} listing${count === 1 ? "" : "s"} found`
    return `${group.shortLabel}: ${found}${group.widenedMiles ? ` (searched up to ${group.widenedMiles} miles)` : ""}`
  })
}

export function angelActivitySteps({ phase, maySearch, elapsedSeconds, resources }: AngelActivityInput): AngelActivityStep[] {
  const steps: AngelActivityStep[] = [{ id: "sent", label: "Message sent to Angel", state: "done" }]
  const working = maySearch ? "Angel may search public directories, then writes a reply" : "Angel is writing a reply"
  if (phase === "waiting") {
    steps.push({ id: "work", label: `${working} (${formatSeconds(elapsedSeconds)} so far)`, state: "active" })
    return steps
  }
  if (phase === "stopped") {
    steps.push({ id: "stopped", label: `Stopped by you after ${formatSeconds(elapsedSeconds)}. Nothing from this request was received or shown.`, state: "stopped" })
    return steps
  }
  if (phase === "failed") {
    steps.push({ id: "failed", label: `No reply confirmed after ${formatSeconds(elapsedSeconds)}. Nothing from this request is shown.`, state: "failed" })
    return steps
  }
  searchStepLabels(resources).forEach((label, index) => steps.push({ id: `search-${index}`, label, state: "done" }))
  steps.push({ id: "reply", label: `Reply received in ${formatSeconds(elapsedSeconds)}`, state: "done" })
  return steps
}
