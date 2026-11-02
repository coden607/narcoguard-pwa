// Check-on-me timer (issue #268). Runs entirely on this phone: if the person doesn't tap
// "I'm okay" before time runs out, the phone sounds a loud alarm and shows an emergency card for
// anyone nearby. It contacts no one; alerting a contact is a separate, human-reviewed follow-up.
// Not a substitute for having someone with you. Never Use Alone (800-484-3731) is a free hotline
// where a person stays on the line and sends help to your location if you stop responding.

export const CHECK_DURATIONS_MIN = [5, 10, 15, 20, 30] as const
export const DEFAULT_DURATION_MIN = 10
export const WARNING_MS = 60_000

export const NEVER_USE_ALONE = { name: "Never Use Alone", tel: "18004843731", display: "800-484-3731", url: "https://neverusealone.com/" }

export type TimerPhase = "idle" | "running" | "warning" | "alarm"

export function endsAtFor(startMs: number, minutes: number): number {
  const safe = CHECK_DURATIONS_MIN.includes(minutes as typeof CHECK_DURATIONS_MIN[number]) ? minutes : DEFAULT_DURATION_MIN
  return startMs + safe * 60_000
}

export function remainingMs(endsAt: number | null, nowMs: number): number {
  return endsAt === null ? 0 : Math.max(0, endsAt - nowMs)
}

export function phaseAt(endsAt: number | null, nowMs: number): TimerPhase {
  if (endsAt === null) return "idle"
  const left = endsAt - nowMs
  if (left <= 0) return "alarm"
  return left <= WARNING_MS ? "warning" : "running"
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}
