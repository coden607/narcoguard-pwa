export const DAILY_LIFE_STORAGE_KEY = "narcoguard_daily_life_v1"

export const JOURNAL_KINDS = ["thought", "mood", "gratitude", "win"] as const
export type JournalKind = typeof JOURNAL_KINDS[number]

export interface DailyLifeModules {
  morningBrief: boolean
  wakeReminder: boolean
  schedule: boolean
  routines: boolean
  thoughtJournal: boolean
  moodJournal: boolean
  gratitudeJournal: boolean
  winsJournal: boolean
  eveningReset: boolean
  weather: boolean
}

export interface RoutineItem {
  id: string
  title: string
  time?: string
  enabled: boolean
}

export interface ScheduleItem {
  id: string
  date: string
  time?: string
  title: string
  location?: string
  done: boolean
}

export interface JournalEntry {
  id: string
  date: string
  kind: JournalKind
  text: string
  mood?: 1 | 2 | 3 | 4 | 5
  energy?: 1 | 2 | 3 | 4 | 5
}

export interface DailyLifeState {
  enabled: boolean
  wakeTime: string
  reminderLeadMinutes: number
  modules: DailyLifeModules
  routines: RoutineItem[]
  schedule: ScheduleItem[]
  journal: JournalEntry[]
}

export interface DailyLifeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const timePattern = /^\d{2}:\d{2}$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""
const bool = (value: unknown) => value === true

export function defaultDailyLifeState(): DailyLifeState {
  return {
    enabled: false,
    wakeTime: "08:00",
    reminderLeadMinutes: 15,
    modules: {
      morningBrief: true,
      wakeReminder: false,
      schedule: true,
      routines: true,
      thoughtJournal: false,
      moodJournal: false,
      gratitudeJournal: false,
      winsJournal: false,
      eveningReset: false,
      weather: false,
    },
    routines: [],
    schedule: [],
    journal: [],
  }
}

export function readDailyLifeState(storage: DailyLifeStorage): DailyLifeState {
  try {
    const raw = storage.getItem(DAILY_LIFE_STORAGE_KEY)
    if (!raw) return defaultDailyLifeState()
    const value = JSON.parse(raw) as Partial<DailyLifeState>
    const defaults = defaultDailyLifeState()
    const modules = { ...defaults.modules }
    if (value.modules && typeof value.modules === "object") {
      for (const key of Object.keys(modules) as (keyof DailyLifeModules)[]) modules[key] = bool(value.modules[key])
    }
    const routines = Array.isArray(value.routines) ? value.routines.flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const candidate = item as RoutineItem
      const title = text(candidate.title, 120)
      if (!title) return []
      return [{
        id: text(candidate.id, 80) || crypto.randomUUID(),
        title,
        ...(typeof candidate.time === "string" && timePattern.test(candidate.time) ? { time: candidate.time } : {}),
        enabled: candidate.enabled !== false,
      }]
    }).slice(-100) : []
    const schedule = Array.isArray(value.schedule) ? value.schedule.flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const candidate = item as ScheduleItem
      const title = text(candidate.title, 160)
      if (!title || !datePattern.test(candidate.date)) return []
      return [{
        id: text(candidate.id, 80) || crypto.randomUUID(),
        date: candidate.date,
        ...(typeof candidate.time === "string" && timePattern.test(candidate.time) ? { time: candidate.time } : {}),
        title,
        ...(text(candidate.location, 160) ? { location: text(candidate.location, 160) } : {}),
        done: candidate.done === true,
      }]
    }).slice(-200) : []
    const journal = Array.isArray(value.journal) ? value.journal.flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const candidate = item as JournalEntry
      const body = text(candidate.text, 2000)
      if (!body || !datePattern.test(candidate.date) || !JOURNAL_KINDS.includes(candidate.kind)) return []
      return [{
        id: text(candidate.id, 80) || crypto.randomUUID(),
        date: candidate.date,
        kind: candidate.kind,
        text: body,
        ...(candidate.mood && candidate.mood >= 1 && candidate.mood <= 5 ? { mood: candidate.mood } : {}),
        ...(candidate.energy && candidate.energy >= 1 && candidate.energy <= 5 ? { energy: candidate.energy } : {}),
      }]
    }).slice(-365) : []

    return {
      enabled: value.enabled === true,
      wakeTime: typeof value.wakeTime === "string" && timePattern.test(value.wakeTime) ? value.wakeTime : defaults.wakeTime,
      reminderLeadMinutes: typeof value.reminderLeadMinutes === "number" && value.reminderLeadMinutes >= 0 && value.reminderLeadMinutes <= 120 ? Math.round(value.reminderLeadMinutes) : defaults.reminderLeadMinutes,
      modules,
      routines,
      schedule,
      journal,
    }
  } catch {
    return defaultDailyLifeState()
  }
}

export function saveDailyLifeState(storage: DailyLifeStorage, state: DailyLifeState) {
  storage.setItem(DAILY_LIFE_STORAGE_KEY, JSON.stringify(state))
}

export function clearDailyLifeState(storage: DailyLifeStorage) {
  storage.removeItem(DAILY_LIFE_STORAGE_KEY)
}

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export interface MorningBrief {
  date: string
  wakeTime: string
  nextSchedule?: ScheduleItem
  upcomingRoutines: RoutineItem[]
  summary: string[]
}

export function buildMorningBrief(state: DailyLifeState, date: string, nowTime: string, weather?: string): MorningBrief {
  const now = minutes(nowTime)
  const schedule = state.schedule
    .filter((item) => item.date === date && !item.done)
    .sort((a, b) => (a.time ?? "23:59").localeCompare(b.time ?? "23:59"))
  const nextSchedule = schedule.find((item) => !item.time || minutes(item.time) >= now) ?? schedule[0]
  const upcomingRoutines = state.routines
    .filter((item) => item.enabled && item.time && minutes(item.time) >= now)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, 4)

  const summary: string[] = []
  if (weather) summary.push(weather)
  if (nextSchedule) summary.push(nextSchedule.time ? `Next: ${nextSchedule.title} at ${nextSchedule.time}.` : `Today: ${nextSchedule.title}.`)
  else summary.push("No remaining schedule items are saved for today.")
  if (upcomingRoutines.length) summary.push(`Upcoming routine: ${upcomingRoutines[0].title}${upcomingRoutines[0].time ? ` at ${upcomingRoutines[0].time}` : ""}.`)
  return { date, wakeTime: state.wakeTime, nextSchedule, upcomingRoutines, summary }
}

export function journalKindEnabled(state: DailyLifeState, kind: JournalKind) {
  if (kind === "thought") return state.modules.thoughtJournal
  if (kind === "mood") return state.modules.moodJournal
  if (kind === "gratitude") return state.modules.gratitudeJournal
  return state.modules.winsJournal
}
