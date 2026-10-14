/**
 * Medication and appointment reminder anchors (Feature 26).
 *
 * Records clinician-prescribed times and places and answers "what is due
 * soon" locally. Hard boundaries:
 *
 * - Local storage only; this module performs no network calls and takes a
 *   caller-supplied storage adapter.
 * - No adherence scoring. The module deliberately exports no statistic,
 *   streak, or compliance function. Confirmations are a plain capped log
 *   of timestamps the user chose to record.
 * - Reminders are anchors, not medical advice: no dosing logic, no
 *   interaction checks, no scheduling beyond the clinician-stated time.
 */

export const MEDICATION_REMINDERS_KEY = "narcoguard_medication_reminders_v1"
export const MEDICATION_LABEL_MAX = 120
export const MEDICATION_PLACE_MAX = 160
export const MEDICATION_CONFIRMATION_LOG_MAX = 200
export const MEDICATION_REMINDER_MAX = 30

export const REMINDER_KINDS = ["medication", "appointment"] as const
export type ReminderKind = (typeof REMINDER_KINDS)[number]

export interface MedicationReminder {
  id: string
  kind: ReminderKind
  /** Clinician-stated name or appointment purpose, bounded. */
  label: string
  /** HH:MM local, 24h. */
  time: string
  /** Weekdays 0 (Sun) - 6 (Sat); empty means one-shot on `date`. */
  days: number[]
  /** Required for one-shot appointments; ignored for weekly anchors. */
  date: string | null
  place: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ReminderConfirmation {
  reminderId: string
  at: string
}

interface ReminderState {
  version: 1
  reminders: MedicationReminder[]
  /** Plain log only. Nothing in this module derives statistics from it. */
  confirmations: ReminderConfirmation[]
}

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const emptyState = (): ReminderState => ({ version: 1, reminders: [], confirmations: [] })

export function isReminderKind(value: unknown): value is ReminderKind {
  return (REMINDER_KINDS as readonly string[]).includes(value as string)
}

const validIso = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value))

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidDays(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false
  if (value.length === 0) return true
  if (value.length > 7) return false
  return value.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) && new Set(value).size === value.length
}

export type ReminderInput = {
  kind?: unknown
  label?: unknown
  time?: unknown
  days?: unknown
  date?: unknown
  place?: unknown
  notes?: unknown
}

/** Named errors, same pattern as the supply-exchange validators. */
export function validateReminderInput(input: ReminderInput): { ok: true; value: Omit<MedicationReminder, "id" | "createdAt" | "updatedAt"> } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (!isReminderKind(input.kind)) errors.push("kind must be medication or appointment.")
  const label = typeof input.label === "string" ? input.label.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim() : ""
  if (label.length < 2 || label.length > MEDICATION_LABEL_MAX) errors.push(`label must be 2-${MEDICATION_LABEL_MAX} characters.`)
  if (typeof input.time !== "string" || !TIME_RE.test(input.time)) errors.push("time must be HH:MM.")
  const days = Array.isArray(input.days) ? [...input.days] : []
  if (!isValidDays(days)) errors.push("days must be unique integers 0-6.")
  let date: string | null = null
  if (days.length === 0) {
    if (typeof input.date !== "string" || !validIso(input.date)) errors.push("date is required for one-shot reminders.")
    else date = input.date
  }
  const place = typeof input.place === "string" && input.place.trim() ? input.place.trim().slice(0, MEDICATION_PLACE_MAX) : null
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim().slice(0, 240) : null
  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { kind: input.kind as ReminderKind, label, time: input.time as string, days: days.sort((a, b) => a - b), date, place, notes },
  }
}

export function readReminders(storage: StorageLike): ReminderState {
  try {
    const raw = storage.getItem(MEDICATION_REMINDERS_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<ReminderState>
    if (parsed?.version !== 1 || !Array.isArray(parsed.reminders)) return emptyState()
    return {
      version: 1,
      reminders: parsed.reminders.filter(isReminder),
      confirmations: Array.isArray(parsed.confirmations) ? parsed.confirmations.filter((c) => isReminderConfirmation(c)).slice(-MEDICATION_CONFIRMATION_LOG_MAX) : [],
    }
  } catch {
    return emptyState()
  }
}

function isReminder(value: unknown): value is MedicationReminder {
  if (!value || typeof value !== "object") return false
  const r = value as MedicationReminder
  return typeof r.id === "string" && isReminderKind(r.kind) && typeof r.label === "string" &&
    TIME_RE.test(r.time) && Array.isArray(r.days) && validIso(r.createdAt) && validIso(r.updatedAt)
}

function isReminderConfirmation(value: unknown): value is ReminderConfirmation {
  const c = value as ReminderConfirmation
  return !!value && typeof c === "object" && typeof c.reminderId === "string" && validIso(c.at)
}

function writeReminders(storage: StorageLike, state: ReminderState): void {
  storage.setItem(MEDICATION_REMINDERS_KEY, JSON.stringify(state))
}

let counter = 0
function nextId(now: string): string {
  counter += 1
  return `med-${Date.parse(now).toString(36)}-${counter.toString(36)}`
}

export type ReminderValue = Omit<MedicationReminder, "id" | "createdAt" | "updatedAt">

export function addReminder(storage: StorageLike, value: ReminderValue, now: string): MedicationReminder | null {
  const state = readReminders(storage)
  if (state.reminders.length >= MEDICATION_REMINDER_MAX) return null
  const reminder: MedicationReminder = { id: nextId(now), ...value, createdAt: now, updatedAt: now }
  state.reminders.push(reminder)
  writeReminders(storage, state)
  return reminder
}

export function removeReminder(storage: StorageLike, id: string): boolean {
  const state = readReminders(storage)
  const before = state.reminders.length
  state.reminders = state.reminders.filter((r) => r.id !== id)
  if (state.reminders.length === before) return false
  writeReminders(storage, state)
  return true
}

/** Next occurrence ISO string from `now`; null when the reminder has no future occurrence. */
export function nextOccurrence(reminder: MedicationReminder, now: string): string | null {
  const at = Date.parse(now)
  const [hh, mm] = reminder.time.split(":").map(Number)
  if (reminder.days.length === 0) {
    if (!reminder.date) return null
    const shot = Date.parse(reminder.date)
    return shot >= at ? reminder.date : null
  }
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(at + offset * 24 * 60 * 60 * 1000)
    candidate.setUTCHours(hh, mm, 0, 0)
    const stamp = candidate.toISOString()
    if (Date.parse(stamp) >= at && reminder.days.includes(candidate.getUTCDay())) return stamp
  }
  return null
}

/** Reminders whose next occurrence falls within [now, now + leadMinutes]. */
export function dueReminders(reminders: readonly MedicationReminder[], now: string, leadMinutes: number): MedicationReminder[] {
  const horizon = Date.parse(now) + Math.max(0, leadMinutes) * 60 * 1000
  return reminders.filter((reminder) => {
    const next = nextOccurrence(reminder, now)
    return next !== null && Date.parse(next) <= horizon
  })
}

/**
 * Record a user-confirmed event. Plain append to a capped log; this module
 * never reads it back for statistics, streaks, or scoring.
 */
export function confirmReminder(storage: StorageLike, reminderId: string, at: string): boolean {
  const state = readReminders(storage)
  if (!state.reminders.some((r) => r.id === reminderId)) return false
  state.confirmations.push({ reminderId, at })
  state.confirmations = state.confirmations.slice(-MEDICATION_CONFIRMATION_LOG_MAX)
  writeReminders(storage, state)
  return true
}
