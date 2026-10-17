import type { SimpleStorage } from "./resource-personalization"

export const MEETINGS_KEY = "narcoguard_saved_meetings_v1"
// Primary-source finders inspected 2026-10-17. No public ingestion API was verified.
export const MEETING_SOURCES = [
  { name: "SMART Recovery USA", url: "https://meetings.smartrecovery.org/meetings/", description: "Search by city and state for online or in-person meetings. Check the finder’s detected timezone." },
  { name: "Narcotics Anonymous World Services", url: "https://na.org/meetingsearch/", description: "Find local NA communities and phonelines for in-person schedules, or open the virtual meeting finder." },
] as const

export type SavedMeeting = {
  id: string; name: string; sourceUrl: string; schedule: string | null; timezone: string | null
  updatedAt: string | null; checkedAt: string | null; status: "listed" | "cancelled" | "unknown"
}

export function validSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 600) return false
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password } catch { return false }
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalizeMeeting(value: unknown): SavedMeeting | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || !row.id || row.id.length > 100 || typeof row.name !== "string" || !row.name.trim() || row.name.length > 160 || !validSourceUrl(row.sourceUrl)) return null
  const timezone = typeof row.timezone === "string" && row.timezone.trim() ? row.timezone.trim() : null
  if (timezone) { try { new Intl.DateTimeFormat("en", { timeZone: timezone }) } catch { return null } }
  const dates: Record<string, string | null> = {}
  for (const key of ["updatedAt", "checkedAt"]) {
    const date = row[key]
    if (date !== null && date !== undefined && date !== "" && (typeof date !== "string" || !validDate(date))) return null
    dates[key] = typeof date === "string" && date ? date : null
  }
  if (!["listed", "cancelled", "unknown"].includes(String(row.status))) return null
  if (row.schedule != null && typeof row.schedule !== "string") return null
  return { id: row.id, name: row.name.trim(), sourceUrl: row.sourceUrl, schedule: typeof row.schedule === "string" ? row.schedule.trim().slice(0, 240) || null : null, timezone, updatedAt: dates.updatedAt, checkedAt: dates.checkedAt, status: row.status as SavedMeeting["status"] }
}

export function meetingState(row: SavedMeeting, now = new Date()): string {
  if (row.status === "cancelled") return "Cancelled according to saved source"
  if (row.status === "unknown" || !row.checkedAt || !row.schedule || !row.timezone) return "Meeting status unknown — confirm with provider"
  const age = now.getTime() - Date.parse(`${row.checkedAt}T00:00:00Z`)
  if (age < 0 || age > 30 * 86400_000) return "Check is out of date — confirm with provider"
  return "Listed by source — confirm before attending"
}

export function readMeetings(storage: SimpleStorage): SavedMeeting[] {
  try { const rows: unknown = JSON.parse(storage.getItem(MEETINGS_KEY) || "[]"); return Array.isArray(rows) ? rows.slice(0, 50).flatMap((row) => { const safe = normalizeMeeting(row); return safe ? [safe] : [] }) : [] } catch { return [] }
}

export function saveMeetings(storage: SimpleStorage, rows: readonly SavedMeeting[]) {
  storage.setItem(MEETINGS_KEY, JSON.stringify(rows.slice(0, 50).flatMap((row) => { const safe = normalizeMeeting(row); return safe ? [safe] : [] })))
}
