export const GUARDIAN_STORAGE_KEY = "narcoguard_guardian_stability_v1"
export const NEEDS = ["food", "water", "sleep", "hygiene", "laundry", "safePlace", "connection", "treatment"] as const
export type Need = typeof NEEDS[number]
export type NeedStatus = "met" | "needs-help"
export interface CheckIn {
  date: string
  needs: Partial<Record<Need, NeedStatus>>
  sleepHours?: number
}
export interface PlanItem { id: string; date: string; title: string; done: boolean }
export interface GuardianState {
  enabled: boolean
  paused: boolean
  postalCode: string
  supportPhone: string
  goals: string[]
  entries: CheckIn[]
  plan: PlanItem[]
}
export interface GuardianStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function defaultGuardianState(): GuardianState {
  return { enabled: false, paused: false, postalCode: "", supportPhone: "", goals: [], entries: [], plan: [] }
}

const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)

export function readGuardianState(storage: GuardianStorage): GuardianState {
  try {
    const data: unknown = JSON.parse(storage.getItem(GUARDIAN_STORAGE_KEY) || "null")
    if (!data || typeof data !== "object") return defaultGuardianState()
    const value = data as Record<string, unknown>
    if (value.enabled !== true || !Array.isArray(value.entries) || !Array.isArray(value.plan) || !Array.isArray(value.goals)) return defaultGuardianState()
    const entries: CheckIn[] = value.entries.slice(-365).filter((entry: unknown) => entry && typeof entry === "object" && isDate((entry as CheckIn).date)).map((entry: CheckIn) => {
      const needs: CheckIn["needs"] = {}
      for (const need of NEEDS) {
        if (entry.needs?.[need] === "met" || entry.needs?.[need] === "needs-help") needs[need] = entry.needs[need]
      }
      return { date: entry.date, needs, ...(typeof entry.sleepHours === "number" && entry.sleepHours >= 0 && entry.sleepHours <= 24 ? { sleepHours: entry.sleepHours } : {}) }
    })
    return {
      enabled: true,
      paused: value.paused === true,
      postalCode: typeof value.postalCode === "string" ? value.postalCode.slice(0, 10) : "",
      supportPhone: typeof value.supportPhone === "string" ? value.supportPhone.slice(0, 30) : "",
      goals: value.goals.filter((goal: unknown) => typeof goal === "string").slice(0, 20).map((goal: string) => goal.slice(0, 160)),
      entries,
      plan: value.plan.filter((item: unknown) => item && typeof item === "object" && isDate((item as PlanItem).date) && typeof (item as PlanItem).title === "string" && typeof (item as PlanItem).id === "string").slice(-100).map((item: PlanItem) => ({ id: item.id.slice(0, 80), date: item.date, title: item.title.slice(0, 160), done: item.done === true })),
    }
  } catch {
    return defaultGuardianState()
  }
}

export function saveGuardianState(storage: GuardianStorage, next: GuardianState): void {
  if (!next.enabled) return
  const previous = readGuardianState(storage)
  if (previous.paused) {
    storage.setItem(GUARDIAN_STORAGE_KEY, JSON.stringify({ ...previous, paused: next.paused }))
    return
  }
  // Normalize the same way as reads and enforce finite local retention.
  storage.setItem(GUARDIAN_STORAGE_KEY, JSON.stringify(next))
  const sanitized = readGuardianState(storage)
  storage.setItem(GUARDIAN_STORAGE_KEY, JSON.stringify(sanitized))
}

export function clearGuardianState(storage: GuardianStorage): void {
  storage.removeItem(GUARDIAN_STORAGE_KEY)
}

export function summarizePattern(entries: CheckIn[]): { observed: number; answered: number; percent: number } | null {
  const unique = new Map(entries.map((entry) => [entry.date, entry]))
  const answered = [...unique.values()].filter((entry) => entry.needs.food === "needs-help" && entry.needs.connection !== undefined)
  if (answered.length < 5) return null
  const observed = answered.filter((entry) => entry.needs.connection === "needs-help").length
  return { observed, answered: answered.length, percent: Math.round(100 * observed / answered.length) }
}
