export const LIFE_SUPPORT_STORAGE_KEY = "narcoguard_life_support_v1"

export interface TransportPlan {
  primary: string
  backup: string
  fallback: string
}

export interface CrisisPlan {
  warningSigns: string
  firstSteps: string
  peopleToContact: string
  safePlaces: string
  reasonsToKeepGoing: string
}

export interface LifeSupportState {
  enabled: boolean
  topGoal: string
  constraints: string[]
  careTasks: { id: string; title: string; due?: string; done: boolean }[]
  documents: { id: string; name: string; have: boolean; replacementNote?: string }[]
  transport: TransportPlan
  crisisPlan: CrisisPlan
  disruptionMode: boolean
}

export interface LifeSupportStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const clean = (value: unknown, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : ""

export function defaultLifeSupportState(): LifeSupportState {
  return {
    enabled: false,
    topGoal: "",
    constraints: [],
    careTasks: [],
    documents: [],
    transport: { primary: "", backup: "", fallback: "" },
    crisisPlan: { warningSigns: "", firstSteps: "", peopleToContact: "", safePlaces: "", reasonsToKeepGoing: "" },
    disruptionMode: false,
  }
}

export function readLifeSupportState(storage: LifeSupportStorage): LifeSupportState {
  try {
    const raw = storage.getItem(LIFE_SUPPORT_STORAGE_KEY)
    if (!raw) return defaultLifeSupportState()
    const input = JSON.parse(raw) as Partial<LifeSupportState>
    return {
      enabled: input.enabled === true,
      topGoal: clean(input.topGoal, 200),
      constraints: Array.isArray(input.constraints) ? input.constraints.map((item) => clean(item, 120)).filter(Boolean).slice(-30) : [],
      careTasks: Array.isArray(input.careTasks) ? input.careTasks.flatMap((item) => {
        if (!item || typeof item !== "object") return []
        const row = item as LifeSupportState["careTasks"][number]
        const title = clean(row.title, 160)
        if (!title) return []
        return [{ id: clean(row.id, 80) || crypto.randomUUID(), title, ...(clean(row.due, 20) ? { due: clean(row.due, 20) } : {}), done: row.done === true }]
      }).slice(-200) : [],
      documents: Array.isArray(input.documents) ? input.documents.flatMap((item) => {
        if (!item || typeof item !== "object") return []
        const row = item as LifeSupportState["documents"][number]
        const name = clean(row.name, 120)
        if (!name) return []
        return [{ id: clean(row.id, 80) || crypto.randomUUID(), name, have: row.have === true, ...(clean(row.replacementNote, 240) ? { replacementNote: clean(row.replacementNote, 240) } : {}) }]
      }).slice(-100) : [],
      transport: {
        primary: clean(input.transport?.primary, 200),
        backup: clean(input.transport?.backup, 200),
        fallback: clean(input.transport?.fallback, 200),
      },
      crisisPlan: {
        warningSigns: clean(input.crisisPlan?.warningSigns, 1200),
        firstSteps: clean(input.crisisPlan?.firstSteps, 1200),
        peopleToContact: clean(input.crisisPlan?.peopleToContact, 1200),
        safePlaces: clean(input.crisisPlan?.safePlaces, 1200),
        reasonsToKeepGoing: clean(input.crisisPlan?.reasonsToKeepGoing, 1200),
      },
      disruptionMode: input.disruptionMode === true,
    }
  } catch {
    return defaultLifeSupportState()
  }
}

export function saveLifeSupportState(storage: LifeSupportStorage, state: LifeSupportState) {
  storage.setItem(LIFE_SUPPORT_STORAGE_KEY, JSON.stringify(state))
}

export function clearLifeSupportState(storage: LifeSupportStorage) {
  storage.removeItem(LIFE_SUPPORT_STORAGE_KEY)
}

export function disruptionSteps(state: LifeSupportState): string[] {
  const steps: string[] = []
  if (state.topGoal) steps.push(`Protect today's priority: ${state.topGoal}.`)
  const unfinished = state.careTasks.find((task) => !task.done)
  if (unfinished) steps.push(`Next small task: ${unfinished.title}.`)
  if (state.transport.primary || state.transport.backup || state.transport.fallback) {
    const option = state.transport.primary || state.transport.backup || state.transport.fallback
    steps.push(`Transportation: use ${option}.`)
  }
  if (state.crisisPlan.firstSteps) steps.push("If things feel unsafe or unmanageable, open your personal crisis plan and use the first step you wrote.")
  if (!steps.length) steps.push("Pick one small action that supports the day you want, then reassess.")
  return steps.slice(0, 4)
}
