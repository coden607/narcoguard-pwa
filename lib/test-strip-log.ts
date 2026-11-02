// Private test-strip result log (issue #276). On-device only: kept in this browser's localStorage
// after the person turns it on, never sent, synced, backed up or logged, and erased in one tap.
// The App PIN (#209) is not built yet, so the page says plainly that anyone who can open this
// browser can read the log. Results are descriptive only: a negative strip never means "safe".

export const TEST_STRIP_LOG_KEY = "narcoguard_test_strip_log_v1"
export const MAX_ENTRIES = 50
export const MAX_NOTE_LENGTH = 80

export const STRIP_KINDS = ["fentanyl", "xylazine"] as const
export const STRIP_RESULTS = ["positive", "negative", "unclear"] as const
export type StripKind = typeof STRIP_KINDS[number]
export type StripResult = typeof STRIP_RESULTS[number]

export interface StripEntry { id: string; date: string; kind: StripKind; result: StripResult; note?: string }

export const RESULT_LABELS: Record<StripResult, string> = {
  positive: "Positive (found)",
  negative: "Negative (not found)",
  unclear: "Unclear or invalid",
}

export const RESULT_ADVICE: Record<StripResult, string> = {
  positive: "Found in this sample. If you still use: much less, go slow, don't use alone, naloxone out.",
  negative: "Not found in this sample, but that doesn't mean it's safe. It can be missed. Still start low and don't use alone.",
  unclear: "Try a new strip and follow its instructions. Until then, treat it as positive.",
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Keeps only well-formed entries, newest first, capped. Anything malformed is dropped. */
export function normalizeEntries(value: unknown): StripEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is StripEntry =>
      !!entry && typeof entry === "object" && typeof entry.id === "string" && isDate(entry.date)
      && STRIP_KINDS.includes(entry.kind) && STRIP_RESULTS.includes(entry.result))
    .map((entry) => {
      const note = typeof entry.note === "string" ? entry.note.trim().slice(0, MAX_NOTE_LENGTH) : ""
      return { id: entry.id.slice(0, 40), date: entry.date, kind: entry.kind, result: entry.result, ...(note ? { note } : {}) }
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_ENTRIES)
}

export function addEntry(entries: StripEntry[], entry: StripEntry): StripEntry[] {
  return normalizeEntries([entry, ...entries])
}

export function removeEntry(entries: StripEntry[], id: string): StripEntry[] {
  return entries.filter((entry) => entry.id !== id)
}

/** null = the log is off (nothing stored). An empty array = on, with no entries yet. */
export function parseStoredLog(raw: string | null): StripEntry[] | null {
  if (raw === null) return null
  try {
    return normalizeEntries(JSON.parse(raw))
  } catch {
    return []
  }
}

/** Counts by result, with the total, for a descriptive summary (never a rate or a prediction). */
export function countResults(entries: StripEntry[]): Record<StripResult, number> & { total: number } {
  const counts = { positive: 0, negative: 0, unclear: 0, total: entries.length }
  for (const entry of entries) counts[entry.result]++
  return counts
}
