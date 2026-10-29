// A small descriptive chart of the person's own logs, shown in Angel on request (issue #246).
// Built on this phone from data already stored here and never sent anywhere. Counts always carry their
// denominator and time window; no percentages, scores, streaks or judgement. A day with nothing
// logged is not a missed day: people often skip logging.
import type { CheckIn } from "@/lib/guardian-stability"

export interface AngelChartRow { label: string; count: number; of: number }
export interface AngelLogChart { title: string; window: string; rows: AngelChartRow[]; empty: boolean; text: string }

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

/** The last `windowDays` days ending on `today` (YYYY-MM-DD), counted from the person's check-ins. */
export function buildAngelLogChart(entries: CheckIn[], today: string, windowDays = 7): AngelLogChart {
  const end = new Date(`${today}T00:00:00`)
  const days = new Set<string>()
  for (let offset = 0; offset < windowDays; offset++) {
    const day = new Date(end)
    day.setDate(end.getDate() - offset)
    days.add(dayKey(day))
  }
  const inWindow = new Map<string, CheckIn>()
  for (const entry of entries) if (days.has(entry.date)) inWindow.set(entry.date, entry)
  const logged = [...inWindow.values()]
  const rows: AngelChartRow[] = [
    { label: "Days with a check-in", count: logged.length, of: windowDays },
    { label: "Days with a meal logged", count: logged.filter((entry) => (entry.meals?.length ?? 0) > 0).length, of: windowDays },
    { label: "Days with sleep logged", count: logged.filter((entry) => typeof entry.sleepHours === "number").length, of: windowDays },
  ]
  const window = `Last ${windowDays} days, ending today`
  const empty = logged.length === 0
  const text = empty
    ? `Nothing is logged on this phone for the last ${windowDays} days. That is fine; logging is optional.`
    : `${window}: ${rows.map((row) => `${row.label.toLowerCase()}, ${row.count} of ${row.of}`).join("; ")}. A day with nothing logged is not counted as missed.`
  return { title: "Your logs on this phone", window, rows, empty, text }
}
